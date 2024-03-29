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
    private seedSaved;

    balanceWaves:number;
    balanceAhrk:number;
    balanceAeur:number;
    balanceAnote:number;
    balanceAint:number;

    earningsWaves:number;
    earningsAhrk:number;
    earningsAeur:number;

    constructor() { 
        this.address = Cookies.get("address");
        this.seed = Cookies.get("seed");
        this.sessionSeed = Cookies.get("sessionSeed");
        this.seedSaved = Cookies.get("seedSaved");

        this.balanceWaves = 0;
        this.balanceAhrk = 0;
        this.balanceAeur = 0;
        this.balanceAnote = 0;
        this.balanceAint = 0;

        this.earningsWaves = 0;
        this.earningsAhrk = 0;
        this.earningsAeur = 0;
    }

    getPage():string {
        this.checkSeedWarning();
        if (this.isLoggedIn()) {
            this.populateData();
            this.getEarningsScript();
            return "main";
        } else {
            if (this.accountExists()) {
                return "login";
            } else {
                return "newaccount";
            }
        }
    }

    getAddress():string {
        return this.address;
    }

    checkSeedWarning() {
        if (!this.seedSaved) {
            $("#seedWarning").show();
        }
    }

    getEarningsScript() {
        var newScript = document.createElement("script");
        newScript.onload = function() {
            wallet.earningsWaves = parseInt(String($("#earningsWaves").val()));
            wallet.earningsAhrk = parseInt(String($("#earningsAhrk").val()));
            wallet.earningsAeur = parseInt(String($("#earningsAeur").val()));
    
            $("#accumulatedEarningsAint").html(String((wallet.earningsWaves / AHRKDEC).toFixed(6)));

            if (t.lang == "en") {
                $("#accumulatedEarningsMain").html(String((wallet.earningsAeur / 100).toFixed(2)));
            } else if (t.lang == "hr") {
                $("#accumulatedEarningsMain").html(String((wallet.earningsAhrk / AHRKDEC).toFixed(6)));
            }
        }
        newScript.async = false;
        var stamp = new Date().getTime();
        newScript.src = earningsScript + "/" + this.getAddress() + "/earnings.js?stamp=" + stamp;
        document.body.appendChild(newScript);
    }

    async collectEarnings(address:string) {
        var amount = 0;
        var assetId = "";
        var fee = 0;

        if (t.lang == "en") {
            amount = 970000000;
            assetId = ANOTE;
            fee = 30000000;
        } else if (t.lang == "hr") {
            amount = 950000;
            assetId = AHRK;
            fee = 50000;
        }

        try {
            await this.signer.transfer({
                amount: amount,
                recipient: address,
                assetId: assetId,
                feeAssetId: assetId,
                fee: fee,
                attachment: libs.crypto.base58Encode(libs.crypto.stringToBytes('collect'))
            }).broadcast();
            if (address == AINTADDRESS) {
                $("#pMessage11").fadeOut(function() {
                    $("#pMessage12").fadeIn(function(){
                        setTimeout(function(){
                            $("#pMessage12").fadeOut(function() {
                                $("#pMessage11").fadeIn();
                                $("#accumulatedEarningsAint").html("0.0000")
                            });
                        }, 2000);
                    });
                });
            } else {
                $("#pMessage9").fadeOut(function() {
                    $("#pMessage10").fadeIn(function(){
                        setTimeout(function(){
                            $("#pMessage10").fadeOut(function() {
                                $("#pMessage9").fadeIn();
                                $("#accumulatedEarningsMain").html("0.000000")
                            });
                        }, 2000);
                    });
                });
            }
        } catch (error) {
            if (error.error == 112) {
                $("#pMessage9").html(t.collectEarnings.notEnough);
            } else {
                $("#pMessage9").html(t.error);
                console.log(error);
            }
        }
    }

    async login() {
        var p = $("#password1").val();
        if (p) {
            var pv = await this.passwordValid(p);
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
                    this.getEarningsScript();
                } catch (e) {
                    $("#pMessage3").html(t.login.wrongPass);
                    $("#pMessage3").fadeIn();
                }
            } else {
                $("#pMessage3").html(t.login.wrongPass);
                $("#pMessage3").fadeIn();
            }
        } else {
            $("#pMessage3").html(t.login.passRequired);
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
        $("#sendError").html(t.qr.message);
        $("#sendError").fadeIn(function(){
            setTimeout(function(){
                $("#sendError").fadeOut();
            }, 2000);
        });
    }

    updateAmount() {
        var currency = $("#sendCurrency").val();

        var amount = 0;
        var dp = this.getDecimalPlaces(String(currency));
        var decimalPlaces = 0;
        if (currency == AHRK) {
            amount = this.balanceAhrk;
            decimalPlaces = 6;
        } else if (currency == AEUR) {
            amount = this.balanceAeur;
            decimalPlaces = 2;
        } else if (currency == "") {
            amount = this.balanceWaves;
            decimalPlaces = 8;
        } else if (currency == AINT) {
            decimalPlaces = 8;
            amount = this.balanceAint;
        } else if (currency == ANOTE) {
            decimalPlaces = 8;
            amount = this.balanceAnote;
        }
        if (currency != AINT) {
            amount -= this.getFee(String(currency));
        }
        var balance = amount / dp;
        if (balance < 0) {
            balance = 0;
        }

        $("#amount").val(String(balance.toFixed(decimalPlaces)));
    }

    updateFeeAmount() {
        var currency = $("#sendCurrency").val();
        var dp = this.getDecimalPlaces(String(currency));
        var decimalPlaces = 0;
        if (currency == AHRK) {
            $("#feeAsset").html("AHRK");
            decimalPlaces = 6;
        } else if (currency == AEUR) {
            $("#feeAsset").html("AEUR");
            decimalPlaces = 2;
        } else if (currency == "") {
            $("#feeAsset").html("WAVES");
            decimalPlaces = 8;
        } else if (currency == AINT) {
            if (t.lang == "hr") {
                $("#feeAsset").html("AHRK");
                decimalPlaces = 6;
                dp = this.getDecimalPlaces(AHRK);
            } else if (t.lang == "en") {
                $("#feeAsset").html("AEUR");
                decimalPlaces = 2;
                dp = this.getDecimalPlaces(AEUR);
            }
        } else if (currency == ANOTE) {
            $("#feeAsset").html("ANOTE");
            decimalPlaces = 8;
        }

        var fee = this.getFee(String(currency));
        var feeStr = fee / dp;

        $("#feePrice").html(String(feeStr.toFixed(decimalPlaces)));
    }

    updateAmountExchange() {
        var currency = $("#fromCurrency").val();

        var amount = 0;
        var dp = this.getDecimalPlaces(String(currency));
        var decimalPlaces = 0;
        if (currency == AHRK) {
            amount = this.balanceAhrk;
            decimalPlaces = 6;
        } else if (currency == AEUR) {
            amount = this.balanceAeur;
            decimalPlaces = 2;
        } else if (currency == "") {
            amount = this.balanceWaves;
            decimalPlaces = 8;
        } else if (currency == AINT) {
            decimalPlaces = 8;
            amount = this.balanceAint;
        } else if (currency == ANOTE) {
            decimalPlaces = 8;
            amount = this.balanceAnote;
        }
        if (currency != AINT) {
            amount -= this.getFee(String(currency));
        }
        var balance = amount / dp;
        if (balance < 0) {
            balance = 0;
        }

        $("#amountExchange").val(String(balance.toFixed(decimalPlaces)));
    }

    updateFeeAmountExchange() {
        var currency = $("#fromCurrency").val();
        var dp = this.getDecimalPlaces(String(currency));
        var decimalPlaces = 0;
        if (currency == AHRK) {
            $("#feeAssetExchange").html("AHRK");
            decimalPlaces = 6;
        } else if (currency == AEUR) {
            $("#feeAssetExchange").html("AEUR");
            decimalPlaces = 2;
        } else if (currency == "") {
            $("#feeAssetExchange").html("WAVES");
            decimalPlaces = 8;
        } else if (currency == AINT) {
            if (t.lang == "hr") {
                $("#feeAssetExchange").html("AHRK");
                decimalPlaces = 6;
                dp = this.getDecimalPlaces(AHRK);
            } else if (t.lang == "en") {
                $("#feeAssetExchange").html("AEUR");
                decimalPlaces = 2;
                dp = this.getDecimalPlaces(AEUR);
            }
        } else if (currency == ANOTE) {
            $("#feeAssetExchange").html("ANOTE");
            decimalPlaces = 8;
        }

        var fee = this.getFee(String(currency));
        var feeStr = fee / dp;

        $("#feePriceExchange").html(String(feeStr.toFixed(decimalPlaces)));
    }

    async changePassword() {
        var p = $("#password9").val();
        if (p) {
            var pv = await this.passwordValid(p);
            if (pv) {
                $("#password9").val("");
                if (passwordsEqual("password6", "password7", "pMessage6")) {
                    $("#pMessage6").hide();
                    var seed = libs.crypto.decryptSeed(this.seed, String(p));
                    var newPass = $("#password6").val();
                    this.encryptSeed(seed, newPass);
                    this.setCookies();
                    $("#password6").val("");
                    $("#password7").val("");
                    $("#pMessage7").html(t.changePass.success);
                    $("#pMessage7").fadeIn(function(){
                        setTimeout(function(){
                            $("#pMessage7").fadeOut();
                        }, 500);
                    });
                }
            } else {
                $("#password9").val("");
                $("#pMessage6").html(t.login.wrongPass);
                $("#pMessage6").fadeIn();
            }
        } else {
            $("#pMessage6").html(t.changePass.oldRequired);
            $("#pMessage6").fadeIn();
        }
    }

    async showSeed() {
        var p = $("#password8").val();
        var pv = await this.passwordValid(p);
        if (pv) {
            var seed = libs.crypto.decryptSeed(this.seed, String(p));
            $("#seedWords2").val(seed);
            $("#buttonSeedCopy").prop('disabled', false);
            $("#password8").val("");
            Cookies.set("seedSaved", "true", { expires: 365*24*10 });
            $("#seedWarning").hide();
        } else {
            $("#pMessage8").html(t.login.wrongPass);
            $("#pMessage8").fadeIn(function(){
                setTimeout(function(){
                    $("#pMessage8").fadeOut();
                }, 500);
            });
        }
    }

    async deleteAccount() {
        var p = $("#password10").val();
        var pv = await this.passwordValid(p);
        if (pv) {
            this.sessionSeed = null;
            this.seed = null;
            this.address = null;
            Cookies.remove("sessionSeed");
            Cookies.remove("seed");
            Cookies.remove("address");
            $("#page-main").fadeOut(function(){
                $("#page-newaccount").fadeIn();
            });
        } else {
            $("#pMessage14").html(t.login.wrongPass);
            $("#pMessage14").fadeIn(function(){
                setTimeout(function(){
                    $("#pMessage14").fadeOut();
                }, 500);
            });
        }
    }

    async send() {
        var currency = $("#sendCurrency").val();
        if (currency == "") {
            currency = undefined;
        }
        var decimalPlaces = this.getDecimalPlaces(String(currency));
        var fee = this.getFee(String(currency));
        var feeCurrency = currency;
        if (currency == AINT) {
            if (t.lang == "hr") {
                feeCurrency = AHRK;
            } else if (t.lang == "en") {
                feeCurrency = AEUR;
            }
        }
        var recipient = $("#addressRec").val()?.toString();
        var a = $("#amount").val();
        if (a && recipient) {
            try {
                var attachment = "";
                if (recipient.startsWith('3A')) {
                    attachment = libs.crypto.base58Encode(libs.crypto.stringToBytes(recipient));
                    recipient = "3PHGRfLy5E4fRcpKbSipvZZN9FKSNCaNCh6";
                }

                var amount: number = +a;
                await this.signer.transfer({
                    amount: Math.floor(amount * decimalPlaces),
                    recipient: recipient,
                    assetId: currency,
                    feeAssetId: feeCurrency,
                    fee: fee,
                    attachment: attachment
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
                    $("#sendError").html(t.send.notEnough);
                    $("#sendError").fadeIn(function(){
                        setTimeout(function(){
                            $("#sendError").fadeOut();
                        }, 2000);
                    });
                } else {
                    $("#sendError").html(t.error);
                    $("#sendError").fadeIn(function(){
                        setTimeout(function(){
                            $("#sendError").fadeOut();
                        }, 2000);
                    });
                    console.log(e.message)
                }
            }
        } else {
            $("#sendError").html(t.send.bothRequired);
            $("#sendError").fadeIn(function(){
                setTimeout(function(){
                    $("#sendError").fadeOut();
                }, 2000);
            });
        }
    }

    async exchange() {
        var from = $("#fromCurrency").val();
        if (from == "") {
            from = undefined;
        }
        var to = $("#toCurrency").val();
        var decimalPlaces = this.getDecimalPlaces(String(from));
        var fee = this.getFee(String(from));
        var feeCurrency = from;

        if (from == to) {
            $("#exchangeError").html(t.exchange.currenciesSame);
            $("#exchangeError").fadeIn(function(){
                setTimeout(function(){
                    $("#exchangeError").fadeOut();
                }, 2000);
            });
        } else {
            if (to == AINT) {
                var recipient = "3PBmmxKhFcDhb8PrDdCdvw2iGMPnp7VuwPy";
            } else {
                var recipient = "3PPc3AP75DzoL8neS4e53tZ7ybUAVxk2jAb";
            }

            var a = $("#amountExchange").val();
            if (a) {
                try {
                    var amount: number = +a;
                    await this.signer.transfer({
                        amount: Math.floor(amount * decimalPlaces),
                        recipient: recipient,
                        assetId: from,
                        feeAssetId: feeCurrency,
                        fee: fee
                    }).broadcast();
                    $("#exchangeSuccess").fadeIn(function(){
                        setTimeout(function(){
                            $("#exchangeSuccess").fadeOut();
                            $("#amount").val("");
                            $("#addressRec").val("");
                        }, 2000);
                    });
                } catch (e) {
                    if (e.error == 112) {
                        $("#exchangeError").html(t.send.notEnough);
                        $("#exchangeError").fadeIn(function(){
                            setTimeout(function(){
                                $("#exchangeError").fadeOut();
                            }, 2000);
                        });
                    } else {
                        $("#exchangeError").html(t.error);
                        $("#exchangeError").fadeIn(function(){
                            setTimeout(function(){
                                $("#exchangeError").fadeOut();
                            }, 2000);
                        });
                        console.log(e.message)
                    }
                }
            } else {
                $("#exchangeError").html(t.exchange.amountRequired);
                $("#exchangeError").fadeIn(function(){
                    setTimeout(function(){
                        $("#exchangeError").fadeOut();
                    }, 2000);
                });
            }
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
            this.getEarningsScript();
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
                this.getEarningsScript();
            } else {
                $("#pMessage2").html(t.import.seedRequired);
                $("#pMessage2").fadeIn();
            }
        }
    }

    async populateBalance() {
        try {
            const balances = await this.signer.getBalance();

            balances.forEach(function (asset) {
                if (asset.assetId == AHRK) {
                    wallet.balanceAhrk = asset.amount;
                    if (t.lang == "hr") {
                        var balance = wallet.balanceAhrk / AHRKDEC;
                        balance = Math.round(balance * 100) / 100;
                        $("#balance").html(String(balance.toFixed(2)));
                    }
                } else if (asset.assetId == AEUR) {
                    wallet.balanceAeur = asset.amount;
                    if (t.lang == "en") {
                        var balance = Math.round(wallet.balanceAeur) / 100;
                        $("#balance").html(String(balance.toFixed(2)));
                    }
                } else if (asset.assetId == "WAVES") {
                    wallet.balanceWaves = asset.amount;
                    var balance = wallet.balanceWaves / SATINBTC;
                    $("#balanceWaves").html(String(balance.toFixed(8)));
                } else if (asset.assetId == AINT) {
                    wallet.balanceAint = asset.amount;
                    var balance = wallet.balanceAint / SATINBTC;
                    $("#balanceAint").html(String(balance.toFixed(4)));
                } else if (asset.assetId == ANOTE) {
                    wallet.balanceAnote = asset.amount;
                    var balance = wallet.balanceAnote / SATINBTC;
                    $("#balanceAnotes").html(String(balance.toFixed(8)));
                }
            });
        } catch (e) {
            console.log(e);
        }
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
        var historyHref = "https://wavesexplorer.com/address/" + this.address + "/tx";
        $("#history").attr("href", historyHref);
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

    private getDecimalPlaces(currency:string):number {
        if (currency == "" || currency == AINT || currency == ANOTE) {
            return SATINBTC;
        } else if (currency == AHRK) {
            return AHRKDEC;
        } else if (currency == AEUR) {
            return 100;
        }
        return SATINBTC;
    }

    private getFee(currency:string) {
        if (currency == AHRK) {
            return 50000;
        } else if (currency == AEUR) {
            return 1;
        } else if (currency == "") {
            return 100000;
        } else if (currency == ANOTE) {
            return 30000000;
        } else if (currency == AINT) {
            if (t.lang == "hr") {
                return 50000;
            } else if (t.lang == "en") {
                return 1;
            }
        }
        return 100000;
    }
}

const AHRK = "Gvs59WEEXVAQiRZwisUosG7fVNr8vnzS8mjkgqotrERT";
const AEUR = "Az4MsPQZn9RJm8adcya5RuztQ49rMGUW99Ebj56triWr";
const AINT = "66DUhUoJaoZcstkKpcoN3FUcqjB6v8VJd5ZQd6RsPxhv";
const ANOTE = "4zbprK67hsa732oSGLB6HzE8Yfdj3BcTcehCeTA1G5Lf";

const AHRKDEC = 1000000;
const SATINBTC = 100000000;
const AHRKADDRESS = "3PPc3AP75DzoL8neS4e53tZ7ybUAVxk2jAb";
const AINTADDRESS = "3PBmmxKhFcDhb8PrDdCdvw2iGMPnp7VuwPy"

var activeScreen = "home";
var earningsScript = "https://aint.kriptokuna.com";
var t;

const wallet = new Wallet();

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
    wallet.updateAmount();
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

$("#addressBook").on( "click", function() {
    activeScreen = "addressBook";
    $("#screen-home").fadeOut(function(){
        $("#screen-addressBook").fadeIn();
    });
});

$("#backFromAddressBook").on( "click", function() {
    activeScreen = "home";
    $("#screen-addressBook").fadeOut(function(){
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

$("#tabButton1").on( "click", function() {
    $("#tabButton1").addClass("active");
    $("#tabButton2").removeClass("active");
    $("#tabButton3").removeClass("active");
    $("#tabButton4").removeClass("active");
    $("#tabButton5").removeClass("active");
    $("#tab2").hide();
    $("#tab3").hide();
    $("#tab4").hide();
    $("#tab5").hide();
    $("#tab1").fadeIn();
});

$("#tabButton2").on( "click", function() {
    $("#tabButton2").addClass("active");
    $("#tabButton1").removeClass("active");
    $("#tabButton3").removeClass("active");
    $("#tabButton4").removeClass("active");
    $("#tabButton5").removeClass("active");
    $("#tab1").hide();
    $("#tab3").hide();
    $("#tab4").hide();
    $("#tab5").hide();
    $("#tab2").fadeIn();
});

$("#tabButton3").on( "click", function() {
    $("#tabButton3").addClass("active");
    $("#tabButton1").removeClass("active");
    $("#tabButton2").removeClass("active");
    $("#tabButton4").removeClass("active");
    $("#tabButton5").removeClass("active");
    $("#tab1").hide();
    $("#tab2").hide();
    $("#tab4").hide();
    $("#tab5").hide();
    $("#tab3").fadeIn();
});

$("#tabButton4").on( "click", function() {
    $("#tabButton4").addClass("active");
    $("#tabButton1").removeClass("active");
    $("#tabButton2").removeClass("active");
    $("#tabButton3").removeClass("active");
    $("#tabButton5").removeClass("active");
    $("#tab1").hide();
    $("#tab2").hide();
    $("#tab3").hide();
    $("#tab5").hide();
    $("#tab4").fadeIn();
});

$("#tabButton5").on( "click", function() {
    $("#tabButton5").addClass("active");
    $("#tabButton1").removeClass("active");
    $("#tabButton2").removeClass("active");
    $("#tabButton3").removeClass("active");
    $("#tabButton4").removeClass("active");
    $("#tab1").hide();
    $("#tab2").hide();
    $("#tab3").hide();
    $("#tab4").hide();
    $("#tab5").fadeIn();
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

$("#buttonDeleteAccount").on( "click", function() {
    wallet.deleteAccount();
});

$("#buttonSend").on( "click", function() {
    wallet.send();
});

$("#buttonExchange").on( "click", function() {
    wallet.exchange();
});

$("#buttonShowSeed").on( "click", function() {
    wallet.showSeed();
});

$("#buttonChangePass").on( "click", function() {
    wallet.changePassword();
});

$("#buttonCollect").on( "click", function() {
    wallet.collectEarnings(AHRKADDRESS);
});

$("#sendCurrency").on( "change", function() {
    wallet.updateAmount();
    wallet.updateFeeAmount();
});

$("#fromCurrency").on( "change", function() {
    wallet.updateAmountExchange();
    wallet.updateFeeAmountExchange();
});

$("#buttonCollectEarnings").on( "click", function() {
    wallet.collectEarnings(AINTADDRESS);
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

$("#buttonCopyReferral").on( "click", function() {
    var link = $("#referralLink").val();
    copy(String(link));
    $("#pMessage13").fadeIn(function(){
        setTimeout(function(){
            $("#pMessage13").fadeOut();
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
            $("#buttonSeedCopy").prop('disabled', true);
        }, 500);
    });
});

function createTranslation() {
    var lang = $("#lang").val();
    $.getJSON("locales/" + lang + ".json", function( data ) {
        t = data.app;
        const page = wallet.getPage();
        $("#page-loading").fadeOut(function(){
            $("#page-" + page).fadeIn();
        });
    });
}

document.addEventListener('DOMContentLoaded', (event) => {
    createTranslation();
})

// Helper functions

function passwordsEqual(p1id, p2id, mid):boolean {
    var p1 = $("#" + p1id).val();
    var p2 = $("#" + p2id).val();

    if (!p1 || !p2) {
        $("#" + mid).html(t.bothPassRequired);
        $("#" + mid).fadeIn();
        return false;
    }

    if (p1 == p2) {
        return true;
    } else {
        $("#" + mid).html(t.passwordsDontMatch);
        $("#" + mid).fadeIn();
        return false;
    }
}