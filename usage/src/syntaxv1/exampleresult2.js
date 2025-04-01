import { buildComposition } from "../../pjs/Composition.js";

class Hat {
    constructor(type) {
        this.type = type;
        console.log("The hat property has been set to: " + this.type);
    }
}

class HatWearer {
    constructor() {
    }

    wear() {
        throw "Missing implementation for abstract function 'wear'";
    }
}

class Person {
    constructor(name) {
        this.name = name;
        (()=>{
            buildComposition(this);
            var impl = this;

            var _Composed_HatWearer = new HatWearer();
            var _Composed_HatWearer_Wear = new Function("impl", "hat", `
                console.log("Im wearing a " + hat.type + " hat! Says, " + impl.name);
            `);
            _Composed_HatWearer.wear = (hat) => (_Composed_HatWearer_Wear(impl, hat));

            this._Composition = [
                _Composed_HatWearer
            ];
        })();
    }
}

var person = new Person("John");
person.as(HatWearer).wear(new Hat("Bowler"));