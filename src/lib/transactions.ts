import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';
import { algodClient } from './algorand';

export const signAndSendTransactions = async (
    peraWallet: PeraWalletConnect,
    txns: algosdk.Transaction[],
    address: string
) => {
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Assign group ID if multiple txns
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
        const txId = response.txid;
        await algosdk.waitForConfirmation(algodClient, txId, 4);
        return txId;
    } catch (error) {
        console.error('Signing failed:', error);
        throw error;
    }
};

export const deployEscrowContract = async (
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

    return await signAndSendTransactions(peraWallet, [txn], sender);
};
