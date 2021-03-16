import { Signer } from '@waves/signer';
import { ProviderSeed } from '@waves/provider-seed';
import { libs } from '@waves/waves-transactions';
import $ from "jquery";

const seed = "admit drink family great deposit fade exhibit taste piece tomato because fall invest donor opera";
const signer = new Signer();
const provider = new ProviderSeed(seed);
signer.setProvider(provider);

console.log(seed);
console.log(signer);
console.log(provider);

console.log(libs.crypto.address(seed))

$("#backFromReceive").on( "click", function() {
    $("#screen-receive").fadeToggle(function(){
        $("#screen-home").fadeToggle();
    });
});

$("#receive").on( "click", function() {
    $("#screen-home").fadeToggle(function(){
        $("#screen-receive").fadeToggle();
    });
});