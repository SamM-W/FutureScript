console.log("Hello how are you doing!");
x= hello().hello()

function hello() {
    return;
}

hello()

function hello(twoFisHo) {
    return twoFisHo;
}

function hello(twoFisHo, threFishHo) {
    return twoFisHo;
}
var x = 0;
var y = y + 2;
x = 2 + y;

x += 2 * y;
x =-(x +
2
 / 52) / 52;


 function typecompositiongetAllFuncs(target) {
    var reservedFuncs = ["constructor", "toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable" ]
    const props = [];
    let obj = target;
    
    return props.sort().filter((e, i, arr) => { 
        if (e.substring(0, 2) == "__" || reservedFuncs.indexOf(e) != -1) return false;
        if (e!=arr[i+1] && typeof target[e] == 'function') return true;
    });
}

export class Composed {

    constructor() {
        this.composition = [];
        this._invoke = {};
        for (var i = 0; i < arguments.length; i++) {
            const component = arguments[i];
            for (var property of typecomposition$getAllFuncs(component)) {
                const wrapped = component[property];
                this[property] = () => wrapped.call(component, this, ...arguments);
            }
            this.composition.push(component);
        }
        for (var component of this.composition) {
            if (component._composed && component._composed.expectMethods) {
                for (var expected of component._composed.expectMethods) {
                    if (this[expected] == undefined)
                        throw "Expected function that is not implemented ('" + expected + "(?)')";
                }
            }
        }
    }

    as(type) {
        for (var component of this.composition) {
            if (component instanceof type) {
                return component;
            }
        }
        return undefined;
    }

    invokable(component, method, onInvoke) {
        this._invoke[method] = [...(this._invoke[method] ? this._invoke[method] : []), {component, onInvoke}];
        this[method] = () => {
            for (var invoke of this._invoke[method]) {
                invoke.call(component, this, ...arguments);
            }
        }
    }

}