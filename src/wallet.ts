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

$("#receive").on( "click", function() {
    $("#screen-home").fadeOut(function(){
        $("#screen-receive").fadeIn();
    });
});

$("#backFromReceive").on( "click", function() {
    $("#screen-receive").fadeOut(function(){
        $("#screen-home").fadeIn();
    });
});

$("#send").on( "click", function() {
    $("#screen-home").fadeOut(function(){
        $("#screen-send").fadeIn();
    });
});

$("#backFromSend").on( "click", function() {
    $("#screen-send").fadeOut(function(){
        $("#screen-home").fadeIn();
    });
});

$("#cards").on( "click", function() {
    $("#screen-home").fadeOut(function(){
        $("#screen-cards").fadeIn();
    });
});

$("#backFromCards").on( "click", function() {
    $("#screen-cards").fadeOut(function(){
        $("#screen-home").fadeIn();
    });
});

$("#settings").on( "click", function() {
    $("#screen-home").fadeOut(function(){
        $("#screen-settings").fadeIn();
    });
});

$("#backFromSettings").on( "click", function() {
    $("#screen-settings").fadeOut(function(){
        $("#screen-home").fadeIn();
    });
});