import $ from "jquery";
import "regenerator-runtime/runtime.js";
import Wallet from 'wallet';

var wallet = new Wallet();
var activeScreen = "home";

$("#receive").on( "click", function() {
    activeScreen = "receive";
    $("#screen-home").fadeOut(function(){
        $("#screen-receive").fadeIn();
    });
});

$("#backFromReceive").on( "click", function() {
    activeScreen = "home";
    $("#screen-receive").fadeOut(function(){
        // $("#screen-home").fadeIn();
    });
});

$("#send").on( "click", function() {
    activeScreen = "send";
    $("#screen-home").fadeOut(function(){
        $("#screen-send").fadeIn();
    });
});

$("#backFromSend").on( "click", function() {
    activeScreen = "home";
    $("#screen-send").fadeOut(function(){
        $("#screen-home").fadeIn();
    });
});

$("#cards").on( "click", function() {
    activeScreen = "cards";
    $("#screen-home").fadeOut(function(){
        $("#screen-cards").fadeIn();
    });
});

$("#backFromCards").on( "click", function() {
    activeScreen = "home";
    $("#screen-cards").fadeOut(function(){
        $("#screen-home").fadeIn();
    });
});

$("#settings").on( "click", function() {
    if (activeScreen != "home") {
        $("#screen-" + activeScreen).fadeOut(function(){
            $("#screen-settings").fadeIn();
            activeScreen = "settings";
        });
    } else {
        activeScreen = "settings";
        $("#screen-home").fadeOut(function(){
            $("#screen-settings").fadeIn();
        });
    }
});

$("#backFromSettings").on( "click", function() {
    activeScreen = "home";
    $("#screen-settings").fadeOut(function(){
        $("#screen-home").fadeIn();
    });
});

document.addEventListener('DOMContentLoaded', (event) => {
    $("#page-loading").fadeOut(function(){
        var page = getPage();
        $("#page-" + page).fadeIn();
    });
})

function getPage() {
    // return "main";
    return "login";
}