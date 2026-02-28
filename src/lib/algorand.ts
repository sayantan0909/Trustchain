import algosdk from 'algosdk';

const algodToken = '';
const algodServer = 'https://testnet-api.algonode.cloud';
const algodPort = 443;

export const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

export const getIndexerClient = () => {
    return new algosdk.Indexer('', 'https://testnet-idx.algonode.cloud', 443);
};

export const compileProgram = async (programSource: string) => {
    const encoder = new TextEncoder();
    const programBytes = encoder.encode(programSource);
    const compileResponse = await algodClient.compile(programBytes).do();
    return new Uint8Array(Buffer.from(compileResponse.result, 'base64'));
};
