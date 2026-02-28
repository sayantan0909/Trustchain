
import algosdk from 'algosdk';
import fs from 'fs';
import path from 'path';

const algodToken = '';
const algodServer = 'https://testnet-api.algonode.cloud';
const algodPort = 443;
const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

async function main() {
    const tealPath = './src/contracts/escrow_approval.teal';
    const tealSource = fs.readFileSync(tealPath, 'utf8');

    console.log('Compiling TEAL...');
    try {
        const result = await algodClient.compile(tealSource).do(); // sourcemap(true) is not available in JS SDK directly usually
        // Wait, algosdk's compile method returns { result, hash }.
        // If I want sourcemap, I might need to call it differently or use lower level request.
        
        console.log('Compile success!');
        const bytecode = Buffer.from(result.result, 'base64');
        console.log('Bytecode length:', bytecode.length);
        
        // Manual disassembly / PC mapping
        let pc = 0;
        let line = 0;
        const lines = tealSource.split('\n');
        
        // This is very rough. Real disassembly is needed.
        // But since I don't have a disassembler handy, I will try to map by instruction size.
        // Most instructions are 1 byte.
        // Int constants: int 1 -> 1 byte (if using intc block) or 2 bytes (0x81 0x01).
        // byte constants: byte len content -> 1 + varint(len) + content.
        
        // Let's just print the bytecode in hex and try to decipher around 165.
        console.log('Bytecode (hex):', bytecode.toString('hex'));
        
        // Find pattern for main_l6 start:
        // txn Sender (31 00)
        // byte "client" (27) - index 0
        // app_global_get (64)
        // == (12)
        // assert (44)
        
        const pattern = '310027641244';
        let index = bytecode.toString('hex').indexOf(pattern);
        while (index !== -1) {
            console.log('Found pattern at byte offset:', index / 2);
            // Print next few bytes
            const offset = index / 2;
            const nextBytes = bytecode.slice(offset + 6, offset + 20).toString('hex');
            console.log('Next bytes:', nextBytes);
            
            index = bytecode.toString('hex').indexOf(pattern, index + 1);
        }


    } catch (e) {
        console.error('Error compiling:', e);
    }
}

main();
