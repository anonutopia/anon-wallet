import { Signer } from '@waves/signer';
import { libs } from '@waves/waves-transactions';
import { ProviderSeed } from '@waves/provider-seed';
import $ from "jquery";
import "regenerator-runtime/runtime.js";
import Cookies from "js-cookie";

class Wallet { 
    private address;
    private seed;

    constructor() { 
        this.address = Cookies.get("address");
        this.seed = Cookies.get("seed");
    }

    getAddress():string { 
        return this.address;
    }

    register():void { 
        if (passwordsEqual("password2", "password3", "pMessage1")) {
            var p = $("#password2").val();
            var seed = libs.crypto.randomSeed();
            this.seed = libs.crypto.encryptSeed(seed, String(p));
            Cookies.set("seed", this.seed);
            this.registerAddress(seed);
        }
    }

    private async registerAddress(seed):Promise<void> {
        var signer = new Signer();
        var provider = new ProviderSeed(this.seed);
        signer.setProvider(provider);
        var user = await signer.login();
        this.address = user.address;
        Cookies.set("address", this.address);
        $("#address").val(this.address);
        finishNewAccount();
    }

    getPage():string {
        if (this.isLoggedIn()) {
            return "main";
        } else {
            if (this.accountExists()) {
                return "login";
            } else {
                return "newaccount";
            }
        }
    }

    accountExists():boolean {
        if (this.seed) {
            return true;
        } else {
            return false;
        }
    }

    isLoggedIn():boolean {
        if (this.address) {
            return true;
        } else {
            return false;
        }
    }
}

var wallet = new Wallet();
var activeScreen = "home";

// Button bindings

$("#receive").on( "click", function() {
    activeScreen = "receive";
    $("#screen-home").fadeOut(function(){
        $("#screen-receive").fadeIn();
    });
});

$("#backFromReceive").on( "click", function() {
    activeScreen = "home";
    $("#screen-receive").fadeOut(function(){
        $("#screen-home").fadeIn();
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

$("#buttonShowExisting").on( "click", function() {
    $("#newAccount").fadeOut(function(){
        $("#existingAccount").fadeIn();
    });
});

$("#buttonNewAccount").on( "click", function() {
    $("#existingAccount").fadeOut(function(){
        $("#newAccount").fadeIn();
    });
});

$("#buttonRegister").on( "click", function() {
    wallet.register();
});

document.addEventListener('DOMContentLoaded', (event) => {
    $("#page-loading").fadeOut(function(){
        var page = wallet.getPage();
        $("#page-" + page).fadeIn();
    });
})

// Helper functions

function passwordsEqual(p1id, p2id, mid):boolean {
    var p1 = $("#" + p1id).val();
    var p2 = $("#" + p2id).val();

    if (!p1 || !p2) {
        $("#" + mid).html("Oba polja su obavezna.");
        $("#" + mid).fadeIn();
        return false;
    }

    if (p1 == p2) {
        return true;
    } else {
        $("#" + mid).html("Prva i druga lozinka se ne podudaraju.");
        $("#" + mid).fadeIn();
        return false;
    }
}

function finishNewAccount() {
    activeScreen = "home";
    $("#page-newaccount").fadeOut(function(){
        $("#page-main").fadeIn();
    });
}