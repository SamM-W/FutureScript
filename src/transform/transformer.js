import { Token } from "../token/tokens.js";
import { TokenType } from "../token/tokentypes.js";

export function applySimpleTransformToToken(token) {
    if (token.type == TokenType.INSTRUCTION_BREAK) {
        token.content = ";"
    }
    if (token.type == TokenType.VAR_DEF) {
        console.log(token.toString())
        var defaultKeywords = ["var", "let", "const"];
        if (defaultKeywords.indexOf(token.content) != -1) {
            return;
        }
        var primitiveTypes = ["string", "number", "boolean", "object", "function"];
        var isPrimitive = primitiveTypes.indexOf(token.content) != -1;

        var wrapped = token.inner[2].inner;
        var functionCallVarValue = new Token(TokenType.VAR_VALUE, "validateIsOf");
        var functionCallFuncOpen = new Token(TokenType.FUNCTION_OPEN_BRACKETS, "(");
        var functionCallFuncNext = new Token(TokenType.FUNCTION_INVOKE_NEXT_ARGUMENT, ",");        
        functionCallFuncOpen.inner = [...wrapped, functionCallFuncNext,
            isPrimitive ? new Token(TokenType.LITERAL_STRING, "\""+ token.content + "\"") : new Token(TokenType.VAR_NAME, token.content)
        ];
        var functionCallFuncClose = new Token(TokenType.FUNCTION_CLOSE_BRACKETS, ")");

        functionCallVarValue.inner = [functionCallFuncOpen, functionCallFuncClose];
        token.inner[2].inner = [functionCallVarValue];
        console.log(token.toString());
        token.content = "var";

    }
}