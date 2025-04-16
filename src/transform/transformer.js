import { Token } from "../token/tokens.js";
import { TokenType } from "../token/tokentypes.js";
import { applyCompositionTransformToToken } from "./composition.js";

function createValidationFunctionCall(typeToken, wrapped) {
    var primitiveTypes = ["string", "number", "boolean", "object", "function"];
    var isPrimitive = primitiveTypes.indexOf(typeToken) != -1;

    var functionCallVarValue = new Token(TokenType.VAR_VALUE, "validateIsOf");
    var functionCallFuncOpen = new Token(TokenType.FUNCTION_OPEN_BRACKETS, "(");
    var functionCallFuncNext = new Token(TokenType.FUNCTION_INVOKE_NEXT_ARGUMENT, ",");        
    functionCallFuncOpen.inner = [...wrapped, functionCallFuncNext,
        isPrimitive ? new Token(TokenType.LITERAL_STRING, "\""+ typeToken + "\"") : new Token(TokenType.VAR_NAME, typeToken)
    ];
    var functionCallFuncClose = new Token(TokenType.FUNCTION_CLOSE_BRACKETS, ")");

    functionCallVarValue.inner = [functionCallFuncOpen, functionCallFuncClose];
    return functionCallVarValue;
}

export function applySimpleTransformToToken(token) {
    if (token.type == TokenType.INSTRUCTION_BREAK) {
        token.content = ";"
    }
    if (token.type == TokenType.VAR_DEF) {
        var defaultKeywords = ["var", "let", "const"];
        if (defaultKeywords.indexOf(token.content) != -1) {
            return;
        }
        token.inner[2].inner = [createValidationFunctionCall(token.content, token.inner[2].inner)];
        console.log(token.toString());
        token.content = "var";
    }
    if (token.type == TokenType.FUNCTION_DEFINITION) {
        applyArgumentTypeChecking(token);
    }
    if (token.type == TokenType.CONSTRUCTOR_FUNCTION_DEFINITION) {
        var properties = [];

        var constructorArguments = token.inner[0].inner;
        for (var i = 0; i < constructorArguments.length; i++) {
            var innerToken = constructorArguments[i];
            if (innerToken.type == TokenType.CLASS_CONSTRUCTOR_PROPERTY) {
                var propertyName = constructorArguments[i+1].type == TokenType.FUNCTION_ARGUMENT_TYPE ? constructorArguments[i+2].content : constructorArguments[i+1].content;
                properties.push(propertyName);
                constructorArguments.splice(i, 1);
                i--;
            }
        }
        token.inner[0].inner = constructorArguments;

        token.inner[2].inner.unshift(new Token(TokenType.CODE_INJECT, 
            properties.map((propertyName) => `this.${propertyName} = ${propertyName};`).join("")
        ));
        applyArgumentTypeChecking(token);
    }
    applyCompositionTransformToToken(token);
}

function applyArgumentTypeChecking(token) {
    var functionArguments = token.inner[0].inner;
    var argumentsToCheck = {};
    for (var i = 0; i < functionArguments.length; i++) {
        var argument = functionArguments[i];
        if (argument.type == TokenType.FUNCTION_ARGUMENT_TYPE) {
            var typeToken = argument.content;
            var argumentName = functionArguments[i + 1].content;
            argumentsToCheck[argumentName] = typeToken;
        }
    }
    for (var i = 0; i < functionArguments.length; i++) {
        var argument = functionArguments[i];
        if (argument.type == TokenType.FUNCTION_ARGUMENT_TYPE) {
            functionArguments.splice(i, 1);
            i--;
        }
    }
    var argumentNames = Object.keys(argumentsToCheck);
    for (var i = 0; i < argumentNames.length; i++) {
        var argumentName = argumentNames[i];
        var typeToken = argumentsToCheck[argumentName];
        var functionCall = createValidationFunctionCall(typeToken, [new Token(TokenType.VAR_NAME, argumentName)]);
        token.inner[2].inner.unshift(new Token(TokenType.INSTRUCTION_BREAK));
        token.inner[2].inner.unshift(functionCall);
    }
}