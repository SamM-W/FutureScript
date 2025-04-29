import { tokenizeInstruction } from "./tokenizer.js";
import { FlagType, TokenType } from "./tokentypes.js";

const INSTRUCTION_BREAK_MATCH = /^[;\n\r]+[\s]*/;

export function tokenizeString(tkzr) {
    var stringParseChar = tkzr.consumeChar();
    var stringChar = stringParseChar;
    var stringContents = "";
    var nextIsEscaped = false;

    while (stringParseChar != "") {
        var nextChar = tkzr.consumeChar();
        if (!nextIsEscaped) {
            if (/["'`]/.test(nextChar)) {
                if (nextChar == stringParseChar) {
                    stringParseChar = "";
                    continue;
                }
            }
        }
        nextIsEscaped = false;
        if (nextChar == '\\') {
            nextIsEscaped = true;
        }
        stringContents += nextChar;
    }
    tkzr.addTokenWithoutCapture(TokenType.LITERAL_STRING, stringChar + stringContents + stringChar);
    tkzr.trimRemaining();
}

export function parsePostValue(tkzr) {
    tkzr.in()
    
    if (tkzr.test(/^\[[\s]*/)) {
        tkzr.token(TokenType.VAR_INDEX_OPEN_BRACKETS, /^\[[\s]*/)
            .in();
        tokenizeValue(tkzr)
        tkzr.token(TokenType.VAR_INDEX_CLOSE_BRACKETS, /^\][\s]*/)
            .out()
    }

    var isInNullCheck = tkzr.optionalToken(TokenType.INLINE_NULL_CHECK, /^\?.\s*/)
    .didConsume();

    if (tkzr.test(/^\([\s]*/)) {
        tkzr.token(TokenType.FUNCTION_OPEN_BRACKETS, /^\([\s]*/)
        tkzr.optionalToken(TokenType.FUNCTION_CLOSE_BRACKETS, /^\)[\s]*/)
            .else(() => {
                tkzr.in()
                while (true) {
                    tokenizeValue(tkzr);
                    if (!tkzr.optionalToken(TokenType.FUNCTION_INVOKE_NEXT_ARGUMENT, /^,[\s]*/).didConsume())
                        break;
                }
                tkzr.out()
                tkzr.token(TokenType.FUNCTION_CLOSE_BRACKETS, /^\)[\s]*/)
            });
        isInNullCheck = false;
    }
    
    if (tkzr.test(/^\[[\s]*/)) {
        tkzr.token(TokenType.VAR_INDEX_OPEN_BRACKETS, /^\[[\s]*/)
            .in();
        tokenizeValue(tkzr)
        tkzr.token(TokenType.VAR_INDEX_CLOSE_BRACKETS, /^\][\s]*/)
            .out();
        isInNullCheck = false;
    }
    
    var isInNullCheck = isInNullCheck || tkzr.optionalToken(TokenType.INLINE_NULL_CHECK, /^\?.\s*/)
        .didConsume();

    if (tkzr.test(/^\.[\s]*/) || isInNullCheck) {
        tkzr.optionalToken(TokenType.VAR_PROPERTY, /^\.[\s]*/)
        tkzr.token(TokenType.VAR_VALUE, /^[_a-zA-Z0-9$]+[\s]*/)
        parsePostValue(tkzr);
    }
    tkzr.out();
}

export function tokenizeNonStringValueOrThrow(tkzr) {
    tkzr.optionalToken(TokenType.NOT, /^(\!|not)[\s]*/);
    tkzr.optionalToken(TokenType.NEGATIVE, /^\-[\s]*/);
    tkzr.optionalToken(TokenType.TYPEOF, /^typeof[\s]*/);
    tkzr.optionalToken(TokenType.OBJECT_EXPANSION, /^\.\.\.[\s]*/);
    tkzr.optionalToken(TokenType.CONSTRUCTOR_INVOKE, /^new[\s]+/);
    var parseResult = tkzr
        .optionalToken(TokenType.LITERAL_NUMBER, /^0x[0-9A-Fa-f]+[\s]*/)
        .elseOptionalToken(TokenType.LITERAL_NUMBER, /^0b[01]+[\s]*/)
        .elseOptionalToken(TokenType.LITERAL_NUMBER, /^[0-9.]+[\s]*/)
        .elseOptionalToken(TokenType.LAMBDA_FUNCTION_HEADER, /^\s*\((\s*[_0-9a-zA-Z]+\s*)?(\s*,\s*[_0-9a-zA-Z]+\s*)*\)\s*=>\s*/, () => {
            tkzr.optionalToken(TokenType.OPEN_CODE_BLOCK, /^\{[\s]*/, () => {
                tkzr.in()
                    .addTokenContextFlag(FlagType.IN_FUNCTION_DEFINITION);

                while (!tkzr.test(/^\}[\s]*/)) {
                    tokenizeInstruction(tkzr);
                }

                tkzr.out()
                    .token(TokenType.CLOSE_CODE_BLOCK, /^\}[\s]*/);
            }).else(()=>{tokenizeValue(tkzr)})
        })
        .elseOptionalToken(TokenType.VALUE_OPEN_BRACKETS, /^\([\s]*/, () => {
            tkzr.in()

            tokenizeValue(tkzr)

            tkzr.out().token(TokenType.VALUE_CLOSE_BRACKETS, /^\)[\s]*/)
        })
        .elseOptionalToken(TokenType.VAR_VALUE, /^[_a-zA-Z0-9$]+[\s]*/, () => parsePostValue(tkzr))
        .elseOptionalToken(TokenType.ARRAY_OPEN_BRACKETS, /^\[[\s]*/, () => {
            tkzr.in()
            tkzr.optionalToken(TokenType.ARRAY_CLOSE_BRACKETS, /^\][\s]*/)
                .else(() => {
                    while (true) {
                        tokenizeValue(tkzr);
                        if (!tkzr.optionalToken(TokenType.ARRAY_NEXT_VALUE, /^,/).didConsume())
                            break;
                    }
                    tkzr.token(TokenType.ARRAY_CLOSE_BRACKETS, /^\][\s]*/)
                });
            tkzr.out();
        })
        .elseOptionalToken(TokenType.MAP_OPEN_BRACKETS, /^\{\s*/, () => {
            tkzr.in()
            tkzr.optionalToken(TokenType.MAP_CLOSE_BRACKETS, /^\}\s*/)
                .else(() => {
                    while (true) {
                        if (tkzr.optionalToken(TokenType.MAP_CLOSE_BRACKETS, /^\}\s*/).didConsume()) return;
                        tkzr.token(TokenType.MAP_ENTRY_TOKEN, /^[_0-9a-zA-Z]+\s*/)
                            .optionalToken(TokenType.MAP_ASSIGNMENT, /^:\s*/, () => {
                                tokenizeValue(tkzr);
                            })
                        if (!tkzr.optionalToken(TokenType.MAP_NEXT_VALUE, /^,\s*/).didConsume())
                            break;
                    }
                    tkzr.token(TokenType.MAP_CLOSE_BRACKETS, /^\}\s*/)
                });
            tkzr.out();
        })
    parseResult.elseThrow("Unknown value");
}

export function tokenizeOperatorOrInstructionBreak(tkzr) {
    if (tkzr.test(INSTRUCTION_BREAK_MATCH)) {
        return false;
    }

    return tkzr
        .optionalToken(TokenType.MULTI_OPERATOR, /^(!==|===|==|&&|\|\||!=|<=|>=|or|and)[\s]*/)
        .elseOptionalToken(TokenType.SINGLE_OPERATOR, /^[|^&\+\-\*\/%<>][\s]*/)
        .elseOptionalToken(TokenType.INSTANCEOF, /^instanceof\s*/)
        .didConsume();
}

export function tokenizeValue(tkzr) {
    if (tkzr.test(/^["'`]/))
        tokenizeString(tkzr);
    else
        tokenizeNonStringValueOrThrow(tkzr);
    
    parsePostValue(tkzr)

    tkzr.optionalToken(TokenType.INLINE_IF_TRUE, /^\?\s*/, () => {
            tkzr.in()
            tokenizeValue(tkzr);
            tkzr.out().token(TokenType.INLINE_IF_FALSE, /^\s*:/).in()
            tokenizeValue(tkzr);
            tkzr.out();
        })

    if (tokenizeOperatorOrInstructionBreak(tkzr))
        tokenizeValue(tkzr);
}