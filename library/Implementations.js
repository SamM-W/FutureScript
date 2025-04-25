export function range(i, j=null) {
    if (j === null) {
        j = i;
        i = 0;
    }
    if (i > j) {
        throw new Error("Start value cannot be greater than end value");
    }
    const result = [];
    for (let k = i; k < j; k++) {
        result.push(k);
    }
    return result;
}

export const log = console.log

export function validateIsOf(object, type) {
    if (object == undefined) return object;
    if (type == "string") return object.toString();

    if (typeof object == "object") {
        if (object instanceof type) return object;
        if (object.constructor == type) return object;
        throw new Error("Expected object type '" + type.name + "' but got '" + object.constructor.name + "' in variable definition");
    }
    if (typeof object == type) return object;
    throw new Error("Expected type '" + type + "' but got '" + typeof object + "' in variable definition");
}