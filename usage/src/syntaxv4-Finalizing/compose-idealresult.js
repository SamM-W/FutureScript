class User {
    constructor(
        name,
        age
    ) {
        this.name = name;
        this.age = age;
        
        this._composure = {
            base: {
                "canAccessStorefront": {
                    procedure: false
                },
                "logAllPermissions": {
                    procedure: true
                },
            }
        };
        this._traits = [];
        this.as = (traitType) => {
            for (var i = 0; i < this._traits.length; i++) {
                if (this._traits[i] instanceof traitType) {
                    return this._traits[i];
                }
            }
            return null;
        };
        this.addTrait = (trait) => {
            this._traits.push(trait);
            for (const functionName in this._composure.base) {
                if (trait[functionName]) {
                    const isProcedure = this._composure.base[functionName].procedure;
                    const traitFunction = trait[functionName];
                    const next = this[functionName];
                    this[functionName] = (...args) => {
                        if (isProcedure) {
                            next.apply(trait, [...args, this])
                            traitFunction.apply(trait, [...args, this]);
                        } else {
                            return traitFunction.apply(trait, [...args, this, next]);
                        }
                    }
                }
            }
        };
    }

    canAccessStorefront(storefrontId, comp, next) {
        return false;
    }

    logAllPermissions(comp) {
        console.log("Logging user permissions:");
    }
}

class Admin {
    constructor(
    ) {
    }

    canAccessStorefront(storefrontId, comp, next) {
        return true;
    }

    logAllPermissions(comp) {
        console.log("Hello from admin permissions.");
    }
}

class StorefrontOwner {
    constructor(
        storefrontId
    ) {
        this.storefrontId = storefrontId;
    }

    canAccessStorefront(storefrontId, comp, next) {
        return this.storefrontId == storefrontId || next?.(...arguments.slice(0,-2));
    }

    logAllPermissions(comp) {
        console.log("Hello from storefont (" + this.storefrontId + ") permissions.");
    }
}

var user = new User("John", 30);
user.addTrait(new StorefrontOwner("storefrontId1"));

var user2 = new User("Jane", 25);
user2.addTrait(new StorefrontOwner("storefrontId2"));
user2.addTrait(new StorefrontOwner("storefrontId3"));

console.log(user.canAccessStorefront("storefrontId1")); // true

console.log(user2.canAccessStorefront("storefrontId1")); // false

console.log(user2.canAccessStorefront("storefrontId2")); // true
console.log(user2.canAccessStorefront("storefrontId3")); // true