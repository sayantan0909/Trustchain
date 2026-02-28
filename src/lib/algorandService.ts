import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';
import { algodClient } from './algorand';
import { supabase } from '@/lib/supabase';

export const signAndSendTransactions = async (
    peraWallet: PeraWalletConnect,
    txns: algosdk.Transaction[],
    address: string
) => {
    const suggestedParams = await algodClient.getTransactionParams().do();

    if (txns.length > 1) {
        algosdk.assignGroupID(txns);
    }

    const formattedTxns = txns.map((txn) => ({
        txn,
        signers: [address],
    }));

    try {
        const signedTxns = await peraWallet.signTransaction([formattedTxns]);
        const response = await algodClient.sendRawTransaction(signedTxns).do();
        const txId = (response as any).txId || response.txid; // handle case differences across versions

        // Wait for confirmation
        await algosdk.waitForConfirmation(algodClient, txId, 4);
        return txId;
    } catch (error) {
        console.error('Signing failed:', error);
        throw error;
    }
};

export const deployContract = async (
    peraWallet: PeraWalletConnect,
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
        algosdk.encodeUint64(BigInt(amountPerMilestone))
    ];

    const txn = algosdk.makeApplicationCreateTxnFromObject({
        sender: sender,
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

    const txId = await signAndSendTransactions(peraWallet, [txn], sender);

    // Get the App ID after deployment
    const txInfo = await algodClient.pendingTransactionInformation(txId).do();
    const appId = Number(txInfo.applicationIndex || (txInfo as any)['application-index']);
    const appAddress = algosdk.getApplicationAddress(appId);

    return { txId, appId, appAddress };
};

export const fundEscrow = async (
    peraWallet: PeraWalletConnect,
    sender: string,
    appAddress: string,
    amountMicroAlgos: number
) => {
    const params = await algodClient.getTransactionParams().do();

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender,
        receiver: appAddress,
        amount: BigInt(amountMicroAlgos),
        suggestedParams: params
    });

    const txId = await signAndSendTransactions(peraWallet, [txn], sender);
    return txId;
};

export const approveEscrow = async (
    peraWallet: PeraWalletConnect,
    sender: string,
    appId: number,
    milestoneId: string, // Supabase milestone UUID
) => {
    const params = await algodClient.getTransactionParams().do();

    // Encode 'approve' string into Uint8Array
    const encoder = new TextEncoder();
    const arg = encoder.encode('approve');

    const txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: appId,
        appArgs: [arg],
        suggestedParams: params
    });

    const txId = await signAndSendTransactions(peraWallet, [txn], sender);

    // Store txn_id in Supabase milestones table
    const { error } = await supabase
        .from('milestones')
        .update({
            status: 'approved',
            txn_id: txId,
            approved_at: new Date().toISOString()
        })
        .eq('id', milestoneId);

    if (error) {
        console.error('Failed to update milestone in Supabase:', error);
    }

    return txId;
};

export const refundEscrow = async (
    peraWallet: PeraWalletConnect,
    sender: string,
    appId: number
) => {
    const params = await algodClient.getTransactionParams().do();

    const encoder = new TextEncoder();
    const arg = encoder.encode('refund');

    // Refund method requires NOOP with "refund" arg (or Delete Application)
    const txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: appId,
        appArgs: [arg],
        suggestedParams: params
    });

    const txId = await signAndSendTransactions(peraWallet, [txn], sender);
    return txId;
};
