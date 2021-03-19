import { Signer } from '@waves/signer';
import { libs } from '@waves/waves-transactions';
import { ProviderSeed } from '@waves/provider-seed';
var QRCode = require('qrcode');
import $ from "jquery";
import "regenerator-runtime/runtime.js";
import Cookies from "js-cookie";
import copy from 'copy-to-clipboard';

class Wallet { 
    private address;
    private seed;
    private sessionSeed;
    private user;
    private signer;
    private provider;

    constructor() { 
        this.address = Cookies.get("address");
        this.seed = Cookies.get("seed");
        this.sessionSeed = Cookies.get("sessionSeed");
    }

    getPage():string {
        if (this.isLoggedIn()) {
            this.populateData();
            return "main";
        } else {
            if (this.accountExists()) {
                return "login";
            } else {
                return "newaccount";
            }
        }
    }

    async login() {
        var p = $("#password1").val();
        if (p) {
            var pv = this.passwordValid(p);
            if (pv) {
                try {
                    var seed = libs.crypto.decryptSeed(this.seed, String(p));
                    await this.initWaves(seed);
                    var d = new Date();
                    d.setHours(d.getHours()+1)
                    this.sessionSeed = libs.crypto.encryptSeed(String(seed), this.address);
                    Cookies.set("sessionSeed", this.sessionSeed, { expires: d });
                    this.populateData();
                    this.showHomeAfterLogin();
                } catch (e) {
                    $("#pMessage3").html("Lozinka je pogrešna, pokušajte ponovo.");
                    $("#pMessage3").fadeIn();
                }
            } else {
                $("#pMessage3").html("Lozinka je pogrešna, pokušajte ponovo.");
                $("#pMessage3").fadeIn();
            }
        } else {
            $("#pMessage3").html("Lozinka je obavezna.");
            $("#pMessage3").fadeIn();
        }
    }

    logout() {
        this.sessionSeed = null;
        Cookies.remove("sessionSeed");
        $("#page-main").fadeOut(function(){
            $("#page-login").fadeIn();
        });
    }

    qrscan() {
        // alert("fdsaf");
    }

    async showSeed() {
        var p = $("#password8").val();
        var pv = await this.passwordValid(p);
        if (pv) {
            var seed = libs.crypto.decryptSeed(this.seed, String(p));
            $("#seedWords2").val(seed);
            $("#buttonSeedCopy").prop('disabled', false);
        } else {
            alert("wrong");
        }
    }

    async send() {
        var recipient = $("#addressRec").val();
        var a = $("#amount").val();
        if (a && recipient) {
            try {
                var amount: number = +a;
                await this.signer.transfer({
                    amount: Math.floor(amount * AHRKDEC),
                    recipient: recipient,
                    assetId: AHRK,
                    feeAssetId: AHRK,
                    fee: 50000
                }).broadcast();
                $("#sendSuccess").fadeIn(function(){
                    setTimeout(function(){
                        $("#sendSuccess").fadeOut();
                        $("#amount").val("");
                        $("#addressRec").val("");
                    }, 2000);
                });
            } catch (e) {
                if (e.error == 112) {
                    $("#sendError").html("Nemate dovoljno novca na računu. Naknada iznosi 5 lipa.");
                    $("#sendError").fadeIn(function(){
                        setTimeout(function(){
                            $("#sendError").fadeOut();
                        }, 2000);
                    });
                } else {
                    $("#sendError").html("Dogodila se greška. Pokušajte ponovo.");
                    $("#sendError").fadeIn(function(){
                        setTimeout(function(){
                            $("#sendError").fadeOut();
                        }, 2000);
                    });
                    console.log(e.message)
                }
            }
        } else {
            $("#sendError").html("Oba polja su obavezna");
            $("#sendError").fadeIn(function(){
                setTimeout(function(){
                    $("#sendError").fadeOut();
                }, 2000);
            });
        }
    }

    async register() { 
        if (passwordsEqual("password2", "password3", "pMessage1")) {
            var seed = libs.crypto.randomSeed();
            await this.initWaves(seed);
            var p = $("#password2").val();
            this.encryptSeed(seed, p);
            this.setCookies();
            this.populateData();
            this.showHomeAfterRegister();
        }
    }

    async import() {
        if (passwordsEqual("password4", "password5", "pMessage2")) {
            var seed = $("#seedWords1").val();
            if (seed) {
                await this.initWaves(seed);
                var p = $("#password4").val();
                this.encryptSeed(seed, p);
                this.setCookies();
                this.populateData();
                this.showHomeAfterRegister();
            } else {
                $("#pMessage2").html("Seed riječi su obavezne.");
                $("#pMessage2").fadeIn();
            }
        }
    }

    async populateBalance() {
        const balances = await this.signer.getBalance();
        balances.forEach(function (asset) {
            if (asset.assetId == AHRK) {
                var balance = asset.amount / AHRKDEC;
                balance = Math.round(balance * 100) / 100;
                $("#balance").html(String(balance.toFixed(2)));
            }
        });
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async initWaves(seed) {
        this.signer = new Signer();
        this.provider = new ProviderSeed(seed);
        this.signer.setProvider(this.provider);
        this.user = await this.signer.login();
        this.address = this.user.address;
    }

    private encryptSeed(seed, password) {
        this.seed = libs.crypto.encryptSeed(String(seed), String(password));
        this.sessionSeed = libs.crypto.encryptSeed(String(seed), this.address);
    }

    private decryptSeedSession():string {
        var seed = libs.crypto.decryptSeed(this.sessionSeed, this.address);
        return seed;
    }

    private setCookies() {
        Cookies.set("address", this.address, { expires: 365*24*10 });
        Cookies.set("seed", this.seed, { expires: 365*24*10 });

        var d = new Date();
        d.setHours(d.getHours()+1)

        Cookies.set("sessionSeed", this.sessionSeed, { expires: d });
    }

    private async populateData() {
        $("#address").val(this.address);
        this.generateQR();

        if (!this.signer) {
            var seed = this.decryptSeedSession();
            await this.initWaves(seed);
        }

        await wallet.populateBalance();

        setInterval(async function(){
            try {
                await wallet.populateBalance();
            } catch (e) {}
        }, 30000);
    }

    private accountExists():boolean {
        if (this.seed) {
            return true;
        } else {
            return false;
        }
    }

    private isLoggedIn():boolean {
        if (this.sessionSeed) {
            return true;
        } else {
            return false;
        }
    }

    private generateQR() {
        QRCode.toString(this.address, function (error, qr) {
            if (error) console.error(error);
            $('#qrcode').replaceWith( $('<div/>').append(qr).find('svg:first').attr('id','qrcode') );
            $('#qrcode').attr('class', 'qrcode border border-dark')
        })
    }

    private showHomeAfterRegister() {
        activeScreen = "home";
        $("#page-newaccount").fadeOut(function(){
            $("#page-main").fadeIn();
        });
    }

    private showHomeAfterLogin() {
        if (activeScreen != "home") {
            $("#screen-" + activeScreen).hide();
            $("#screen-home").show();
        }
        activeScreen = "home";
        $("#page-login").fadeOut(function(){
            $("#page-main").fadeIn();
        });
    }

    private async passwordValid(password):Promise<boolean> {
        if (password) {
            try {
                var seed = libs.crypto.decryptSeed(this.seed, String(password));
                var signer = new Signer();
                var provider = new ProviderSeed(seed);
                signer.setProvider(provider);
                var user = await signer.login();
                if (this.address == user.address) {
                    return true;
                } else {
                    return false;
                }
            } catch (e) {
                return false;
            }
        } else {
            return false;
        }
    }
}

var wallet = new Wallet();
var activeScreen = "home";
const AHRK = "Gvs59WEEXVAQiRZwisUosG7fVNr8vnzS8mjkgqotrERT";
const AHRKDEC = 1000000;
const page = wallet.getPage();

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

$("#qrButton").on( "click", function() {
    // activeScreen = "qr";
    // $("#screen-send").fadeOut(function(){
    //     $("#screen-qr").fadeIn(function() {
    //         wallet.qrscan();
    //     });
    // });
    wallet.qrscan();
});

$("#backFromQR").on( "click", function() {
    activeScreen = "home";
    $("#screen-qr").fadeOut(function(){
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

$("#buttonImport").on( "click", function() {
    wallet.import();
});

$("#buttonLogin").on( "click", function() {
    wallet.login();
});

$("#loginForm").on( "submit", function() {
    wallet.login();
});

$("#buttonLogout").on( "click", function() {
    wallet.logout();
});

$("#buttonSend").on( "click", function() {
    wallet.send();
});

$("#buttonShowSeed").on( "click", function() {
    wallet.showSeed();
});

$("#buttonCopy").on( "click", function() {
    var address = $("#address").val();
    copy(String(address));
    $("#pMessage4").fadeIn(function(){
        setTimeout(function(){
            $("#pMessage4").fadeOut();
        }, 500);
    });
});

$("#buttonSeedCopy").on( "click", function() {
    var seed = $("#seedWords2").val();
    copy(String(seed));
    $("#pMessage5").fadeIn(function(){
        setTimeout(function(){
            $("#pMessage5").fadeOut();
            $("#seedWords2").val("");
        }, 500);
    });
});

document.addEventListener('DOMContentLoaded', (event) => {
    $("#page-loading").fadeOut(function(){
        $("#page-" + page).fadeIn();
    });
})

// Helper functions

function passwordsEqual(p1id, p2id, mid):boolean {
    var p1 = $("#" + p1id).val();
    var p2 = $("#" + p2id).val();

    if (!p1 || !p2) {
        $("#" + mid).html("Oba polja lozinke su obavezna.");
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