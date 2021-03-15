import { Signer } from '@waves/signer';
import { ProviderSeed } from '@waves/provider-seed';
import { libs } from '@waves/waves-transactions';

const seed = "admit drink family great deposit fade exhibit taste piece tomato because fall invest donor opera";
const signer = new Signer();
const provider = new ProviderSeed(seed);
signer.setProvider(provider);

console.log(seed);
console.log(signer);
console.log(provider);

console.log(libs.crypto.address(seed))