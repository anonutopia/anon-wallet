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

    constructor() { 
        this.address = Cookies.get("address");
        this.seed = Cookies.get("seed");
        this.sessionSeed = Cookies.get("sessionSeed");
        this.seedSaved = Cookies.get("seedSaved");
    }

    getPage():string {
        this.checkSeedWarning();
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

    getAddress():string {
        return this.address;
    }

    checkSeedWarning() {
        if (!this.seedSaved) {
            $("#seedWarning").show();
        }
    }

    async exchange(id, address) {
        var a = $("#balanceWaves" + id).val();
        if (a) {
            var amount: number = +a;
            if (amount > 0) {
                try {
                    amount = amount - 0.001
                    await this.signer.transfer({
                        amount: Math.floor(amount * SATINBTC),
                        recipient: address,
                        fee: 100000,
                        attachment: libs.crypto.base58Encode(libs.crypto.stringToBytes('exchange'))
                    }).broadcast();
                    if (id == "1") {
                        $("#exchangeSuccess" + id).html("Zamjena je uspješno napravljena.");
                    } else {
                        $("#exchangeSuccess" + id).html("Tokeni su uspješno poslani u mjenjačnicu.");
                    }
                    $("#exchangeSuccess" + id).fadeIn(function(){
                        setTimeout(function(){
                            $("#exchangeAddress").val("");
                            $("#exchangeSuccess" + id).fadeOut();
                        }, 2000);
                    });
                } catch (e) {
                    $("#exchangeError" + id).html("Dogodila se greška. Pokušajte ponovo.");
                    $("#exchangeError" + id).fadeIn(function(){
                        setTimeout(function(){
                            $("#exchangeError" + id).fadeOut();
                        }, 2000);
                    });
                    console.log(e.message)
                }
            } else {
                $("#exchangeError" + id).html("Za ovu radnju potrebno je imati WAVES tokene.");
                $("#exchangeError" + id).fadeIn(function(){
                    setTimeout(function(){
                        $("#exchangeError" + id).fadeOut();
                    }, 2000);
                });
            }
        }
    }

    async collectInterest() {
        try {
            await this.signer.transfer({
                amount: 950000,
                recipient: AHRKADDRESS,
                assetId: AHRK,
                feeAssetId: AHRK,
                fee: 50000,
                attachment: libs.crypto.base58Encode(libs.crypto.stringToBytes('collect'))
            }).broadcast();
            $("#pMessage9").fadeOut(function() {
                $("#pMessage10").fadeIn(function(){
                    setTimeout(function(){
                        $("#pMessage10").fadeOut(function() {
                            $("#pMessage9").fadeIn();
                            $("#accumulatedInerest").html("0.000000")
                        });
                    }, 2000);
                });
            });
        } catch (error) {
            if (error.error == 112) {
                $("#pMessage9").html("Nemate dovoljno kuna za povlačenje kamate.");
            } else {
                $("#pMessage9").html("Dogodila se greška. Pokušajte ponovo.");
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
        $("#sendError").html("Skeniranje QR koda bit će dostupno u slijedećoj verziji.");
        $("#sendError").fadeIn(function(){
            setTimeout(function(){
                $("#sendError").fadeOut();
            }, 2000);
        });
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
                    $("#pMessage7").html("Lozinka je uspješno promijenjena.");
                    $("#pMessage7").fadeIn(function(){
                        setTimeout(function(){
                            $("#pMessage7").fadeOut();
                        }, 500);
                    });
                }
            } else {
                $("#password9").val("");
                $("#pMessage6").html("Lozinka je pogrešna, pokušajte ponovo.");
                $("#pMessage6").fadeIn();
            }
        } else {
            $("#pMessage6").html("Stara lozinka je obavezna.");
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
            $("#pMessage8").html("Lozinka je pogrešna. Pokušajte ponovo.");
            $("#pMessage8").fadeIn(function(){
                setTimeout(function(){
                    $("#pMessage8").fadeOut();
                }, 500);
            });
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
            } else if (asset.assetId == "WAVES") {
                var balance = asset.amount / SATINBTC;
                $("#balanceWaves1").val(String(balance.toFixed(8)));
                $("#balanceWaves2").val(String(balance.toFixed(8)));
            }
        });
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

const wallet = new Wallet();
const AHRK = "Gvs59WEEXVAQiRZwisUosG7fVNr8vnzS8mjkgqotrERT";
const AHRKDEC = 1000000;
const SATINBTC = 100000000;
const page = wallet.getPage();
const AHRKADDRESS = "3PPc3AP75DzoL8neS4e53tZ7ybUAVxk2jAb";

var activeScreen = "home";
var activeTab = "exTab1";
var interestScript = "https://b31d94ab6e52.ngrok.io";

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

$("#exButton1").on( "click", function() {
    $("#exButton1").toggleClass("active");
    $("#exButton2").toggleClass("active");
    $("#" + activeTab).fadeOut(function(){
        activeTab = "exTab1";
        $("#" + activeTab).fadeIn();
    });
});

$("#exButton2").on( "click", function() {
    $("#exButton2").toggleClass("active");
    $("#exButton1").toggleClass("active");
    $("#" + activeTab).fadeOut(function(){
        activeTab = "exTab2";
        $("#" + activeTab).fadeIn();
    });
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

$("#buttonChangePass").on( "click", function() {
    wallet.changePassword();
});

$("#buttonExchange1").on( "click", function() {
    wallet.exchange("1", AHRKADDRESS);
});

$("#buttonCollect").on( "click", function() {
    wallet.collectInterest();
});

$("#buttonExchange2").on( "click", function() {
    var address = $("#exchangeAddress").val();
    if (address) {
        wallet.exchange("2", address);
    } else {
        $("#exchangeError2").html("Adresa mjenjačnice je obavezna.");
        $("#exchangeError2").fadeIn(function(){
            setTimeout(function(){
                $("#exchangeError2").fadeOut();
            }, 2000);
        });
    }
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
            $("#buttonSeedCopy").prop('disabled', true);
        }, 500);
    });
});

$("#buttonCopyAmount").on( "click", function() {
    var amount = $("#balanceWaves2").val();
    copy(String(amount));
    $("#exchangeSuccess2").html("Iznos je uspješno kopiran.");
    $("#exchangeSuccess2").fadeIn(function(){
        setTimeout(function(){
            $("#exchangeSuccess2").fadeOut();
        }, 500);
    });
});

document.addEventListener('DOMContentLoaded', (event) => {
    var newScript = document.createElement("script");
    newScript.src = interestScript + "/" + wallet.getAddress() + "/interest.js";
    document.body.appendChild(newScript);

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