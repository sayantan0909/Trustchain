/**
 * algorandService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Transaction signing abstraction layer – works identically with Pera Wallet
 * and Lute Wallet via the @txnlab/use-wallet-react unified signing interface.
 *
 * All public functions accept a `signTransactions` callback instead of a
 * hardcoded `PeraWalletConnect` instance, making them wallet-agnostic.
 *
 * Updated for algosdk v3 API (simulateTransactions, globalState camelCase,
 * encodeUnsignedSimulateTransaction, response.txid).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import algosdk from 'algosdk';
import { algodClient } from './algorand';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────
/**
 * Universal signing callback – matches the signature of
 * `signTransactions` returned by `useWallet()` in @txnlab/use-wallet-react.
 */
export type UniversalSignFn = (
    txnGroup: algosdk.Transaction[] | Uint8Array[],
    indexesToSign?: number[]
) => Promise<(Uint8Array | null)[]>;

// ─── Core: Sign & Send ────────────────────────────────────────────────────────
/**
 * Sign a group of transactions with the active wallet (Pera OR Lute),
 * submit to the network, wait for confirmation, and return the txId.
 */
export const signAndSendTransactions = async (
    signTransactions: UniversalSignFn,
    txns: algosdk.Transaction[],
    _address: string          // kept for API compatibility
): Promise<string> => {
    if (txns.length > 1) {
        algosdk.assignGroupID(txns);
    }

    try {
        // use-wallet returns (Uint8Array | null)[] – filter out nulls (unsigned slots)
        const signedRaw = await signTransactions(txns);
        const validSigned = signedRaw.filter((s): s is Uint8Array => s !== null);

        const response = await algodClient.sendRawTransaction(validSigned).do();
        // algosdk v3: PostTransactionsResponse.txid (lowercase)
        const txId = response.txid;

        await algosdk.waitForConfirmation(algodClient, txId, 4);
        return txId;
    } catch (error) {
        console.error('[TrustChain] Transaction signing/submission error:', error);
        throw error;
    }
};

// ─── Simulation ───────────────────────────────────────────────────────────────
/**
 * Simulate a transaction before broadcasting.
 * algosdk v3: use encodeUnsignedSimulateTransaction + algodClient.simulateTransactions()
 */
export const simulateTransaction = async (
    txn: algosdk.Transaction,
    _sender: string
) => {
    try {
        // v3-correct: encodeUnsignedSimulateTransaction produces a Uint8Array
        // suitable for simulation (no dummy sig required)
        const encodedTxn = algosdk.encodeUnsignedSimulateTransaction(txn);
        const decodedSignedTxn = algosdk.decodeSignedTransaction(encodedTxn);

        const simulateReq = new algosdk.modelsv2.SimulateRequest({
            txnGroups: [
                new algosdk.modelsv2.SimulateRequestTransactionGroup({
                    txns: [decodedSignedTxn],
                }),
            ],
            allowEmptySignatures: true,
            allowUnnamedResources: true,
        });

        // v3: algodClient.simulateTransactions() (not .simulate())
        const simulateRes = await algodClient.simulateTransactions(simulateReq).do();

        const groupResult = simulateRes.txnGroups[0];
        if (groupResult.failureMessage) {
            throw new Error(`Simulation failed: ${groupResult.failureMessage}`);
        }

        const txnResult = groupResult.txnResults[0];
        if (txnResult.txnResult.poolError) {
            throw new Error(`Simulation pool error: ${txnResult.txnResult.poolError}`);
        }

        return txnResult;
    } catch (e: any) {
        console.error('[TrustChain] Simulation error:', e);
        if (e.response?.body?.message) {
            throw new Error(`Simulation failed: ${e.response.body.message}`);
        }
        throw e;
    }
};

// ─── Global State ─────────────────────────────────────────────────────────────
export const getApplicationGlobalState = async (appId: number) => {
    const appInfo = await algodClient.getApplicationByID(appId).do();
    // algosdk v3: ApplicationParams.globalState (camelCase, TealKeyValue[])
    const globalState = appInfo.params.globalState ?? [];

    const state: Record<string, any> = {};
    for (const kv of globalState) {
        // In algosdk v3, kv.key is a Uint8Array (raw bytes), not base64 string
        const keyBytes = kv.key instanceof Uint8Array
            ? kv.key
            : Buffer.from(kv.key as string, 'base64');
        const key = Buffer.from(keyBytes).toString();

        const value = kv.value;
        const valueType = Number(value.type);
        if (valueType === 1) {
            // bytes value: Uint8Array
            state[key] = value.bytes instanceof Uint8Array
                ? value.bytes
                : Buffer.from(value.bytes as string, 'base64');
        } else if (valueType === 2) {
            // uint value: bigint or number
            state[key] = value.uint;
        }
    }
    return state;
};

// ─── Deploy Contract ──────────────────────────────────────────────────────────
export const deployContract = async (
    signTransactions: UniversalSignFn,
    sender: string,
    freelancer: string,
    milestonesTotal: number,
    amountPerMilestone: number,
    approvalProgram: Uint8Array,
    clearProgram: Uint8Array
) => {
    const params = await algodClient.getTransactionParams().do();

    const args = [
        algosdk.decodeAddress(sender).publicKey,
        algosdk.decodeAddress(freelancer).publicKey,
        algosdk.encodeUint64(BigInt(milestonesTotal)),
        algosdk.encodeUint64(BigInt(amountPerMilestone)),
    ];

    const txn = algosdk.makeApplicationCreateTxnFromObject({
        sender,
        suggestedParams: params,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        approvalProgram,
        clearProgram,
        numLocalInts: 0,
        numLocalByteSlices: 0,
        numGlobalInts: 3,
        numGlobalByteSlices: 2,
        appArgs: args,
    });

    const txId = await signAndSendTransactions(signTransactions, [txn], sender);

    const txInfo = await algodClient.pendingTransactionInformation(txId).do();
    const appId = Number(
        txInfo.applicationIndex ?? (txInfo as any)['application-index'] ?? 0
    );
    const appAddress = algosdk.getApplicationAddress(appId);

    return { txId, appId, appAddress: appAddress.toString() };
};

// ─── Fund Escrow ──────────────────────────────────────────────────────────────
export const fundEscrow = async (
    signTransactions: UniversalSignFn,
    sender: string,
    appAddress: string,
    amountMicroAlgos: number
) => {
    const params = await algodClient.getTransactionParams().do();

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender,
        receiver: appAddress,
        amount: BigInt(amountMicroAlgos),
        suggestedParams: params,
    });

    return signAndSendTransactions(signTransactions, [txn], sender);
};

// ─── Approve Escrow ───────────────────────────────────────────────────────────
export const approveEscrow = async (
    signTransactions: UniversalSignFn,
    sender: string,
    appId: number,
    milestoneId: string,
    freelancerAddress: string
) => {
    const params = await algodClient.getTransactionParams().do();
    const encoder = new TextEncoder();
    const arg = encoder.encode('approve');

    if (!algosdk.isValidAddress(freelancerAddress)) {
        throw new Error(`Invalid freelancer address: ${freelancerAddress}`);
    }

    // Pre-condition validation against on-chain state
    try {
        const state = await getApplicationGlobalState(appId);
        const clientBytes = state['client'];
        if (clientBytes) {
            const clientAddr = algosdk.encodeAddress(
                clientBytes instanceof Uint8Array ? clientBytes : new Uint8Array(clientBytes)
            );
            if (clientAddr !== sender) {
                console.warn(`Precondition Warning: Sender (${sender}) != Client (${clientAddr})`);
            }
        }

        const completed = Number(state['milestones_completed'] ?? 0);
        const total = Number(state['milestones_total'] ?? 0);
        if (completed >= total) {
            throw new Error(`All milestones already approved (${completed}/${total})`);
        }
        console.log(`[TrustChain] Preconditions OK: ${completed}/${total} milestones approved. Approving next.`);
    } catch (e: any) {
        // Only rethrow pre-condition failures, not state-fetch errors
        if (e.message?.includes('milestones already approved')) throw e;
        console.warn('[TrustChain] Could not fetch app state for pre-validation, proceeding...', e);
    }

    const appIndex = typeof appId === 'string' ? parseInt(appId, 10) : appId;
    if (isNaN(appIndex)) throw new Error('Invalid App ID');

    const txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex,
        appArgs: [arg],
        accounts: [freelancerAddress],
        suggestedParams: params,
    });

    // Simulate before signing to catch TEAL errors early
    console.log('[TrustChain] Simulating approve transaction...');
    try {
        await simulateTransaction(txn, sender);
        console.log('[TrustChain] Simulation successful');
    } catch (e: any) {
        const msg = e.message || '';
        if (msg.includes('pc=165') || msg.includes('assert failed')) {
            if (msg.includes('pc=165')) {
                throw new Error(
                    "Smart Contract Assertion Failed: 'NumAccounts > 1'. Ensure freelancer wallet is correctly linked."
                );
            }
        }
        throw new Error(`Transaction simulation failed: ${msg}`);
    }

    const txId = await signAndSendTransactions(signTransactions, [txn], sender);

    // Update Firestore milestone record
    try {
        await updateDoc(doc(db, 'milestones', milestoneId), {
            status: 'approved',
            txn_id: txId,
            approved_at: serverTimestamp(),
        });
    } catch (error) {
        console.error('[TrustChain] Failed to update milestone in Firestore:', error);
    }

    return txId;
};

// ─── Refund Escrow ────────────────────────────────────────────────────────────
export const refundEscrow = async (
    signTransactions: UniversalSignFn,
    sender: string,
    appId: number
) => {
    const params = await algodClient.getTransactionParams().do();
    const encoder = new TextEncoder();
    const arg = encoder.encode('refund');

    const txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: appId,
        appArgs: [arg],
        suggestedParams: params,
    });

    return signAndSendTransactions(signTransactions, [txn], sender);
};
