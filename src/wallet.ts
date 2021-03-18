class Wallet { 
    private address:string;
    private seed:string;

    constructor() { 
        this.address = "";
        this.seed = "";
    }

    getAddress():string { 
        return this.address;
    } 
}