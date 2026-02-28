
import algosdk from 'algosdk';

async function checkExports() {
    // @ts-ignore
    console.log('algosdk.modelsv2:', algosdk.modelsv2);
    // @ts-ignore
    console.log('algosdk.modelsv2.SimulateRequest:', algosdk.modelsv2 ? algosdk.modelsv2.SimulateRequest : 'undefined');
}

checkExports();
