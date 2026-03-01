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

export class WalletDisconnectedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WalletDisconnectedError';
    }
}

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
): Promise<string | null> => {
    if (!signTransactions || typeof signTransactions !== 'function') {
        throw new WalletDisconnectedError('Wallet disconnected. Please reconnect your wallet.');
    }

    if (txns.length > 1) {
        algosdk.assignGroupID(txns);
    }

    try {
        // use-wallet returns (Uint8Array | null)[] – filter out nulls (unsigned slots)
        const signedRaw = await signTransactions(txns);
        const validSigned = signedRaw.filter((s): s is Uint8Array => s !== null);

        const response = await algodClient.sendRawTransaction(validSigned).do();

        // Calculate the canonical txID from the first transaction in the group
        // instead of relying on the varying algod response formats (base64 vs base32 vs buffer).
        const txId = txns[0].txID();

        await algosdk.waitForConfirmation(algodClient, txId, 15);
        return txId;
    } catch (error: any) {
        const msg = error?.message || error?.toString() || '';
        const code = error?.code;

        // User rejection should be swallowed and return null, NOT trigger a disconnect
        if (
            code === 4001 ||
            code === 4100 ||
            msg.includes('User Rejected Request') ||
            msg.includes('Operation cancelled') ||
            msg.includes('user rejected')
        ) {
            return null;
        }

        // If the transaction is already in the ledger, we can safely consider it a success and return the txId we calculated earlier.
        if (msg.includes('TransactionPool.Remember: transaction already in ledger')) {
            console.log('[TrustChain] Transaction was already in ledger:', txns[0].txID());
            return txns[0].txID();
        }

        const isPeraDisconnect =
            msg.includes('Session disconnected') ||
            msg.includes('No session');

        const isLuteDisconnect =
            msg.includes('No wallet') ||
            msg.includes('Lute not found') ||
            msg.includes('Extension not available');

        if (isPeraDisconnect || isLuteDisconnect) {
            throw new WalletDisconnectedError('Wallet disconnected. Please reconnect your wallet.');
        }

        // Output real errors to console but do not let them bubble up and crash Next.js
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    txns: [decodedSignedTxn as any],
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
        from: sender,
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
    if (!txId) throw new Error('Operation cancelled by user');

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
    // Add 0.1 ALGO buffer (100,000 microAlgos) to the payment amount 
    // to strictly cover the contract's Minimum Balance Requirement and TX fees 
    // evaluated during 'balance - MinBalance' in TEAL
    const totalFundingAmount = BigInt(amountMicroAlgos) + BigInt(200_000);

    const params = await algodClient.getTransactionParams().do();

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: sender,
        to: appAddress,
        amount: totalFundingAmount,
        suggestedParams: params,
    });

    const txId = await signAndSendTransactions(signTransactions, [txn], sender);
    if (!txId) throw new Error('Operation cancelled by user');
    return txId;
};

// ─── Approve Escrow (atomically pays the freelancer via TEAL inner tx) ────────
export const approveEscrow = async (
    signTransactions: UniversalSignFn,
    sender: string,
    appId: number,
    milestoneId: string,
    freelancerAddress: string,
    escrowId: string,
    milestonesTotal: number,
    milestonesCompleted: number
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
        // Only block if the contract has initialized milestone tracking (total > 0).
        // If total === 0 the app state may not yet reflect milestones — let TEAL enforce.
        if (total > 0 && completed >= total) {
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
        from: sender,
        appIndex,
        appArgs: [arg],
        // TEAL asserts txn NumAccounts > 1, so we must include BOTH the client
        // (sender) and the freelancer as foreign accounts (NumAccounts = 2).
        accounts: [sender, freelancerAddress],
        suggestedParams: params,
    });

    // Simulate before signing to catch TEAL errors early
    console.log('[TrustChain] Simulating approve transaction...');
    try {
        await simulateTransaction(txn, sender);
        console.log('[TrustChain] Simulation successful');
    } catch (e: any) {
        // Surface the real simulation error — don't mask it with special-casing.
        throw new Error(`Transaction simulation failed: ${e.message || e}`);
    }

    const txId = await signAndSendTransactions(signTransactions, [txn], sender);
    if (!txId) throw new Error('Operation cancelled by user');

    // ── FIXED: 'approve' in TEAL atomically pays the freelancer via inner tx ──
    // Mark milestone 'paid' immediately after the on-chain tx confirms.
    try {
        await updateDoc(doc(db, 'milestones', milestoneId), {
            status: 'paid',
            txn_id: txId,
            paid_at: serverTimestamp(),
        });

        // If this was the last milestone, mark the whole escrow 'completed'
        if (milestonesCompleted + 1 >= milestonesTotal) {
            await updateDoc(doc(db, 'escrows', escrowId), {
                status: 'completed',
                completed_at: serverTimestamp(),
            });
        }
    } catch (error) {
        console.error('[TrustChain] Failed to update milestone/escrow in Firestore:', error);
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
        from: sender,
        appIndex: appId,
        appArgs: [arg],
        suggestedParams: params,
    });

    const txId = await signAndSendTransactions(signTransactions, [txn], sender);
    if (!txId) throw new Error('Operation cancelled by user');
    return txId;
};
