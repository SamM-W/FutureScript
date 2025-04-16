import { FlagType, TokenType } from "../token/tokentypes.js";
import { Token } from "../token/tokens.js";

const composedClassInject = (compositionMeta) => `
this._composure = ${JSON.stringify(compositionMeta)};
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
                    next.apply(trait, [...args, this]);
                    traitFunction.apply(trait, [...args, this]);
                } else {
                    return traitFunction.apply(trait, [...args, this, next]);
                }
            }
        }
    }
};`.replaceAll(/\s+/g, " ").trim();

export function applyCompositionTransformToToken(token) {
    if (token.type == TokenType.CLASS_DEFINITION) {
        if (token.context == FlagType.IN_TRAIT_DEFINITION) {
            token.content = token.content.replace("trait", "class");
            applyTraitTransformToClass(token);
        }
        if (token.context == FlagType.IN_COMPOSED_CLASS_DEFINITION) {
            token.content = token.content.replace("composed", "");
            applyComposedTransformToClass(token);
        }
    }   
}

function applyComposedTransformToClass(token) {
    var constructorInject = "";
    var classComposeProperties = {
        base: {}
    }
    var constructorToken = null;

    for (var i = 0; i < token.inner.length; i++) {
        var innerToken = token.inner[i];
        if (innerToken.type == TokenType.CONSTRUCTOR_FUNCTION_DEFINITION) {
            constructorToken = innerToken;
            continue
        }
        if (innerToken.type == TokenType.FUNCTION_DEFINITION) {
            var headerBreakdown = /^(async\s*)?(base\s*)(procedure\s*)?/.exec(innerToken.content);
            if (headerBreakdown == null || headerBreakdown[2] == null)
                continue;
            var isProcedure = headerBreakdown[3] != null;

            var functionName = innerToken.content.substring(headerBreakdown[0].length).trim();
            classComposeProperties.base[functionName] = {
                procedure: isProcedure
            };
            innerToken.content = innerToken.content.replace(/^(base\s*)(procedure\s*)?/, "");
        }
    }

    if (constructorToken == null) {
        throw new Error("Constructor not found in composed class definition.");
    }

    constructorToken.inner[2].inner.unshift(new Token(TokenType.CODE_INJECT,
        composedClassInject(classComposeProperties)
    ));

}

function applyTraitTransformToClass(token) {
    for (var i = 0; i < token.inner.length; i++) {
        var innerToken = token.inner[i];
        if (innerToken.type == TokenType.FUNCTION_DEFINITION) {
            var argumentsInject = "";

            var headerBreakdown = /^(async\s*)?(apply\s*)(procedure\s*)?/.exec(innerToken.content);
            if (headerBreakdown == null || headerBreakdown[2] == null)
                continue;
            var isProcedure = headerBreakdown[3] != null;
            innerToken.content = innerToken.content.replace(/^(apply\s*)(procedure\s*)?/, "");
            argumentsInject = isProcedure ? "comp" : "comp, next";

            innerToken.inner[0].inner.push(
                new Token(TokenType.CODE_INJECT,
                    (innerToken.inner[0].inner.length == 0 ? "" : ",") + argumentsInject
                )
            );
            applySimpleTokenTraitTransform(innerToken.inner[2]);
        }
    }
}

function applySimpleTokenTraitTransform(token) {
    if (token.type == TokenType.VAR_VALUE) {
        if (token.content == "next") {
            token.inner.unshift(new Token(TokenType.CODE_INJECT, "(...[...arguments].slice(0,-2))"));
        }
    }
    for (var i = 0; i < token.inner.length; i++) {
        applySimpleTokenTraitTransform(token.inner[i]);
    }
}