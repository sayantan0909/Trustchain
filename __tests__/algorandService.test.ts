
import { approveEscrow } from '../src/lib/algorandService';
import type { UniversalSignFn } from '../src/lib/algorandService';
import algosdk from 'algosdk';

// Mock dependencies
jest.mock('@/lib/algorand', () => ({
    algodClient: {
        getTransactionParams: () => ({
            do: jest.fn().mockResolvedValue({
                fee: BigInt(0),
                firstValid: BigInt(100),
                lastValid: BigInt(1100),
                genesisID: 'testnet-v1.0',
                genesisHash: new Uint8Array(32),
                flatFee: true,
                minFee: BigInt(1000)
            }),
        }),
        getApplicationByID: () => ({
            do: jest.fn().mockResolvedValue({
                params: {
                    // algosdk v3: TealKeyValue[] with Uint8Array keys
                    globalState: [
                        {
                            key: Buffer.from('client'),
                            value: {
                                type: 1,
                                bytes: algosdk.decodeAddress('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ').publicKey,
                                uint: BigInt(0)
                            }
                        },
                        {
                            key: Buffer.from('milestones_completed'),
                            value: { type: 2, bytes: new Uint8Array(0), uint: BigInt(0) }
                        },
                        {
                            key: Buffer.from('milestones_total'),
                            value: { type: 2, bytes: new Uint8Array(0), uint: BigInt(3) }
                        },
                    ]
                }
            })
        }),
        // algosdk v3: simulateTransactions (not .simulate)
        simulateTransactions: () => ({
            do: jest.fn().mockResolvedValue({
                txnGroups: [{
                    failureMessage: null,
                    txnResults: [{ txnResult: { poolError: '' } }]
                }]
            })
        }),
        sendRawTransaction: () => ({
            do: jest.fn().mockResolvedValue({ txid: 'mock-tx-id' })
        }),
        status: () => ({
            do: jest.fn().mockResolvedValue({})
        }),
        pendingTransactionInformation: () => ({
            do: jest.fn().mockResolvedValue({})
        })
    },
}));

jest.mock('algosdk', () => {
    const original = jest.requireActual('algosdk');
    return {
        ...original,
        waitForConfirmation: jest.fn().mockResolvedValue({}),
        encodeUnsignedSimulateTransaction: jest.fn().mockReturnValue(new Uint8Array(10)),
        decodeSignedTransaction: jest.fn().mockReturnValue({}),
    };
});

jest.mock('@/lib/firebase', () => ({
    db: {},
}));

jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    updateDoc: jest.fn().mockResolvedValue(undefined),
    serverTimestamp: jest.fn(),
}));

describe('approveEscrow', () => {
    // UniversalSignFn mock — returns array of signed Uint8Arrays
    const mockSignTransactions: UniversalSignFn = jest.fn().mockResolvedValue([new Uint8Array(10)]);

    // Use valid Algorand addresses
    const sender = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ';
    const freelancer = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ';
    const appId = 123;
    const milestoneId = 'milestone-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully approve escrow when inputs are valid', async () => {
        const txId = await approveEscrow(
            mockSignTransactions,
            sender,
            appId,
            milestoneId,
            freelancer
        );

        expect(txId).toBe('mock-tx-id');
        expect(mockSignTransactions).toHaveBeenCalled();
    });

    it('should fail if freelancer address is invalid', async () => {
        await expect(approveEscrow(
            mockSignTransactions,
            sender,
            appId,
            milestoneId,
            'INVALID_ADDRESS'
        )).rejects.toThrow('Invalid freelancer address');
    });

    it('should fail simulation if assertion fails (pc=165)', async () => {
        const { algodClient } = require('@/lib/algorand');

        // Mock simulation failure
        algodClient.simulateTransactions = () => ({
            do: jest.fn().mockRejectedValue({
                message: 'logic eval error: assert failed pc=165',
                response: { body: { message: 'logic eval error: assert failed pc=165' } }
            })
        });

        await expect(approveEscrow(
            mockSignTransactions,
            sender,
            appId,
            milestoneId,
            freelancer
        )).rejects.toThrow("Smart Contract Assertion Failed: 'NumAccounts > 1'");
    });
});
