import { TokensBuilder } from "./tokens.js";
import { FlagType, TokenType } from "./tokentypes.js";

const INSTRUCTION_BREAK_MATCH = /^[;\n\r]+[\s]*/;

function tokenizeString(tkzr) {
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

function parseVarValueAdditional(tkzr) {
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
        parseVarValueAdditional(tkzr);
    }
    tkzr.out();
}

function tokenizeNonStringValueOrThrow(tkzr) {
    tkzr.optionalToken(TokenType.NOT, /^(\!|not)[\s]*/);
    tkzr.optionalToken(TokenType.NEGATIVE, /^\-[\s]*/);
    tkzr.optionalToken(TokenType.TYPEOF, /^typeof[\s]*/);
    tkzr.optionalToken(TokenType.OBJECT_EXPANSION, /^\.\.\.[\s]*/);
    tkzr.optionalToken(TokenType.CONSTRUCTOR_INVOKE, /^new[\s]*/);
    var parseResult = tkzr
        .optionalToken(TokenType.LITERAL_NUMBER, /^[0-9.]+[\s]*/)
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
        .elseOptionalToken(TokenType.VAR_VALUE, /^[_a-zA-Z0-9$]+[\s]*/, () => parseVarValueAdditional(tkzr))
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
        .elseOptionalToken(TokenType.MAP_OPEN_BRACKETS, /^\{[\s]*/, () => {
            tkzr.in()
            tkzr.optionalToken(TokenType.MAP_CLOSE_BRACKETS, /^\}[\s]*/)
                .else(() => {
                    while (true) {
                        tkzr.token(TokenType.MAP_ENTRY_TOKEN, /^[_0-9a-zA-Z]+\s*/)
                            .optionalToken(TokenType.MAP_ASSIGNMENT, /^:\s*/, () => {
                                tokenizeValue(tkzr);
                            })
                        if (!tkzr.optionalToken(TokenType.MAP_NEXT_VALUE, /^,/).didConsume())
                            break;
                    }
                    tkzr.token(TokenType.MAP_CLOSE_BRACKETS, /^\}[\s]*/)
                });
            tkzr.out();
        })
    parseResult.elseThrow("Unknown value");
}

function tokenizeOperatorOrInstructionBreak(tkzr) {
    if (tkzr.test(INSTRUCTION_BREAK_MATCH)) {
        return false;
    }

    return tkzr
        .optionalToken(TokenType.SINGLE_OPERATOR, /^[\+\-\*\/%<>][\s]*/)
        .elseOptionalToken(TokenType.MULTI_OPERATOR, /^(==|&&|\|\||!=|<=|>=|or|and)[\s]*/)
        .elseOptionalToken(TokenType.INSTANCEOF, /^instanceof\s*/)
        .didConsume();
}

function tokenizeValue(tkzr) {
    if (tkzr.test(/^["'`]/))
        tokenizeString(tkzr);
    else
        tokenizeNonStringValueOrThrow(tkzr);
    
    parseVarValueAdditional(tkzr)

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

function tokenizeInstruction(tkzr) {
    function tokenizeConstructorFunctionBody() {
        tkzr.in()
            .token(TokenType.FUNCTION_OPEN_BRACKETS, /^\([\s]*/)
            .in();

        if (!tkzr.test(/^\)/))
            while (true) {
                tkzr.optionalToken(TokenType.CLASS_CONSTRUCTOR_PROPERTY, /^property[\s]*/);

                var isTypeAnnotated = tkzr.test(/^([a-zA-Z][_a-zA-Z0-9$]*\s+)([a-zA-Z][_a-zA-Z0-9$]*\s*)(,|\))/);
                if (isTypeAnnotated) {
                    tkzr.token(TokenType.FUNCTION_ARGUMENT_TYPE, /^[a-zA-Z][_a-zA-Z0-9$]*[\s]*/);
                    tkzr.token(TokenType.FUNCTION_ARGUMENT_NAME, /^[a-zA-Z][_a-zA-Z0-9$]*[\s]*/);
                } else {
                    tkzr.token(TokenType.FUNCTION_ARGUMENT_NAME, /^[a-zA-Z][_a-zA-Z0-9$]*[\s]*/);
                }
                if (!tkzr.optionalToken(TokenType.FUNCTION_DEFINE_NEXT_ARGUMENT, /^,\s*/).didConsume())
                    break;
            }

        tkzr.out().token(TokenType.FUNCTION_CLOSE_BRACKETS, /^\)[\s]*/)
            .token(TokenType.OPEN_CODE_BLOCK, /^\{[\s]*/)
            .in()
            .addTokenContextFlag(FlagType.IN_FUNCTION_DEFINITION);

        while (!tkzr.test(/^\}[\s]*/)) {
            tokenizeInstruction(tkzr);
        }

        tkzr.out()
            .token(TokenType.CLOSE_CODE_BLOCK, /^\}[\s]*/)
            .out();
    }

    function tokenizeFunctionBody() {
        tkzr.in()
            .token(TokenType.FUNCTION_OPEN_BRACKETS, /^\([\s]*/)
            .in();

        if (!tkzr.test(/^\)/))
            while (true) {
                var isTypeAnnotated = tkzr.test(/^([a-zA-Z][_a-zA-Z0-9$]*\s+)([a-zA-Z][_a-zA-Z0-9$]*\s*)(,|\))/);
                if (isTypeAnnotated) {
                    tkzr.token(TokenType.FUNCTION_ARGUMENT_TYPE, /^[a-zA-Z][_a-zA-Z0-9$]*[\s]*/);
                    tkzr.token(TokenType.FUNCTION_ARGUMENT_NAME, /^[a-zA-Z][_a-zA-Z0-9$]*[\s]*/);
                } else {
                    tkzr.token(TokenType.FUNCTION_ARGUMENT_NAME, /^[a-zA-Z][_a-zA-Z0-9$]*[\s]*/);
                }
                if (!tkzr.optionalToken(TokenType.FUNCTION_DEFINE_NEXT_ARGUMENT, /^,/).didConsume())
                    break;
            }

        tkzr.out().token(TokenType.FUNCTION_CLOSE_BRACKETS, /^\)[\s]*/)
            .token(TokenType.OPEN_CODE_BLOCK, /^\{[\s]*/)
            .in()
            .addTokenContextFlag(FlagType.IN_FUNCTION_DEFINITION);

        while (!tkzr.test(/^\}[\s]*/)) {
            tokenizeInstruction(tkzr);
        }

        tkzr.out()
            .token(TokenType.CLOSE_CODE_BLOCK, /^\}[\s]*/)
            .out();
    }

    function tokenizeControlBlock(context) {
        if (!tkzr.test(/^\{[\s]*/)) {
            tkzr.metaToken(TokenType.OPEN_CODE_BLOCK)
                .in();
            if (context) tkzr.addTokenContextFlag(context)
            tokenizeInstruction(tkzr);
            tkzr.out();
            return;
        }
        tkzr.token(TokenType.OPEN_CODE_BLOCK, /^\{[\s]*/)
            .in();
        if (context) tkzr.addTokenContextFlag(context)

        while (!tkzr.test(/^\}[\s]*/)) {
            tokenizeInstruction(tkzr);
        }

        tkzr.out()
            .token(TokenType.CLOSE_CODE_BLOCK, /^\}[\s]*/);
    }
    tkzr
        //Variable def
        .optionalToken(TokenType.VAR_DEF, /^([a-zA-Z0-9_$]+)[\s]+(?=([a-zA-Z0-9_$]+\s*\=))/, () => {
            tkzr.in()
                .token(TokenType.VAR_NAME, /^[_a-zA-Z0-9$]+\s*/)
                .token(TokenType.VAR_EQUALS, /^=\s*/)
                .metaToken(TokenType.ARGUMENT_VALUE)
                .in();
            tokenizeValue(tkzr);
            tkzr.out()
                .out();
        })
        //Itteration and selection
        .elseOptionalToken(TokenType.CONTROL_BLOCK_IF, /^if\s*(?=\()/, () => {
            tkzr.in()
                .token(TokenType.CONTROL_BLOCK_OPEN_BRACKETS, /^\(\s*/)
                .in();
            tokenizeValue(tkzr)
            tkzr.out().token(TokenType.CONTROL_BLOCK_CLOSE_BRACKETS, /^\)\s*/);
            tokenizeControlBlock();
            tkzr.out();
        })

        .elseOptionalToken(TokenType.CONTROL_BLOCK_WHILE, /^while\s*(?=\()/, () => {
            tkzr.in()
                .token(TokenType.CONTROL_BLOCK_OPEN_BRACKETS, /^\(\s*/)
                .in();
            tokenizeValue(tkzr)
            tkzr.token(TokenType.CONTROL_BLOCK_CLOSE_BRACKETS, /^\)\s*/)
                .out();
            tokenizeControlBlock();
            tkzr.out();
        })
        .elseOptionalToken(TokenType.CONTROL_BLOCK_FOR, /^for\s*(?=\()/, () => {
            tkzr.in()
                .token(TokenType.CONTROL_BLOCK_OPEN_BRACKETS, /^\(\s*/)
                .in();
            if (tkzr.test(/^(const|var|let)\s+[_a-zA-Z0-9$]+\s+(of|in)/)) {
                tkzr.addTokenContextFlag(FlagType.IN_ENHANCED_FOR_DEFINITION)
                    .token(TokenType.VAR_DEF, /^(var|const|let)\s+/)
                    .token(TokenType.VAR_NAME, /^[_a-zA-Z0-9$]+\s+/)
                    .token(TokenType.CONTROL_BLOCK_FOR_ITTERATION_TYPE, /^(of|in)\s+/)
                    .in();
                tokenizeValue(tkzr);
                tkzr.out();
            } else {
                tkzr.addTokenContextFlag(FlagType.IN_NUMERICAL_FOR_DEFINITION);
                tokenizeInstruction(tkzr);
                tokenizeValue(tkzr);
                tkzr.token(TokenType.INSTRUCTION_BREAK, /^;\s*/)
                tokenizeInstruction(tkzr);
            }
            tkzr.token(TokenType.CONTROL_BLOCK_CLOSE_BRACKETS, /^\)\s*/)
                .out();
            tokenizeControlBlock();
            tkzr.out();
        })

        .elseOptionalToken(TokenType.THROW, /^throw[\s]*/, () => {
            tkzr.in()
            tokenizeValue(tkzr);
            tkzr.out()
        })
        //Function definitions
        .elseOptionalFlaggedToken(FlagType.IN_FUNCTION_DEFINITION, TokenType.FUNCTION_RETURN, /^return[\s]*/, () => {
            tkzr.in()
            if (!tkzr.test(/^[\s]*[;}]/)) {
                tokenizeValue(tkzr);
            }
            tkzr.out()
        })

        .elseOptionalToken(TokenType.FUNCTION_DEFINITION, /^(async)?[\s]*function[\s]+[_a-zA-Z0-9$]*[\s]*(?=\()/, tokenizeFunctionBody)
        
        .elseOptionalDirectFlaggedToken(FlagType.IN_COMPOSED_CLASS_DEFINITION, TokenType.CONSTRUCTOR_FUNCTION_DEFINITION, /^constructor*\s*(?=\()/, tokenizeConstructorFunctionBody)
        .elseOptionalDirectFlaggedToken(FlagType.IN_TRAIT_DEFINITION, TokenType.CONSTRUCTOR_FUNCTION_DEFINITION, /^constructor*\s*(?=\()/, tokenizeConstructorFunctionBody)
        .elseOptionalDirectFlaggedToken(FlagType.IN_CLASS_DEFINITION, TokenType.CONSTRUCTOR_FUNCTION_DEFINITION, /^constructor\s*(?=\()/, tokenizeConstructorFunctionBody)

        .elseOptionalDirectFlaggedToken(FlagType.IN_COMPOSED_CLASS_DEFINITION, TokenType.FUNCTION_DEFINITION, /^(async\s+)?((base)\s+(procedure\s+)?)?[_a-zA-Z0-9$]*\s*(?=\()/, tokenizeFunctionBody)
        .elseOptionalDirectFlaggedToken(FlagType.IN_TRAIT_DEFINITION, TokenType.FUNCTION_DEFINITION, /^(async\s+)?((apply)\s+(procedure\s+)?)?[_a-zA-Z0-9$]*\s*(?=\()/, tokenizeFunctionBody)
        .elseOptionalDirectFlaggedToken(FlagType.IN_CLASS_DEFINITION, TokenType.FUNCTION_DEFINITION, /^(async\s)?\s*[_a-zA-Z0-9$]*\s*(?=\()/, tokenizeFunctionBody)


        //Class definition
        .elseOptionalToken(TokenType.CLASS_DEFINITION, /^(export\s+)?(((composed\s+)?class)|trait)\s+[_a-zA-Z0-9$]*[\s]*{/, (token) => {
            var isComposed = /^(export\s*)?(composed\s+)/.test(token.content);
            var isTrait = /^(export)?[\s]*(trait\s+)/.test(token.content);
            tkzr.in()
            if (isComposed) tkzr.addTokenContextFlag(FlagType.IN_COMPOSED_CLASS_DEFINITION);
            else if (isTrait) tkzr.addTokenContextFlag(FlagType.IN_TRAIT_DEFINITION);
            else tkzr.addTokenContextFlag(FlagType.IN_CLASS_DEFINITION);

            while (!tkzr.test(/^\}[\s]*/)) {
                tokenizeInstruction(tkzr);
            }

            tkzr.out()
                .token(TokenType.CLASS_DEFINITION_END, /^\}[\s]*/)
                .out();
        })

        //Variable access
        .elseOptionalToken(TokenType.VAR_ACCESS, /^[_a-zA-Z0-9$]+/, () => {
            parseVarValueAdditional(tkzr)
            if (tkzr.test(/^(زائد\s*زائد\s*|ناقص\s*ناقص\s*)\s*/)) {
                tkzr.in()
                    .token(TokenType.VAR_CHANGE_BY_ONE, /^(زائد\s*زائد\s*|ناقص\s*ناقص\s*)\s*/)
                    .out();
            }
            if (tkzr.test(/^([\+\-\*\/])?=[\s]*/)) {
                tkzr.in()
                .token(TokenType.VAR_ASSIGN_EQUALS, /^([\+\-\*\/])?=[\s]*/)
                .metaToken(TokenType.ARGUMENT_VALUE)
                .in();
                tokenizeValue(tkzr);
                tkzr.out()
                    .out();
            }
        })

        .elseOptionalToken(TokenType.SPACE, /^\s+/)
        .elseThrow("Unknown identifier of instruction");

    tkzr.optionalToken(TokenType.INSTRUCTION_BREAK, INSTRUCTION_BREAK_MATCH).else(() => {
        tkzr.metaToken(TokenType.INSTRUCTION_BREAK)
    });
}

export function tokenize(text) {
    text = text.replaceAll(/\/\/[^\n\t]*$/g, "");
    text = text.replaceAll(/\/\/[^\n\t]*\s/g, "");
    var tkzr = new TokensBuilder(text);

    var i = 0;

    while (!tkzr.isEmpty() && i < 50) {
        var startTokensLength = tkzr.tokens.length;
        tokenizeInstruction(tkzr);
        if (tkzr.tokens.length == startTokensLength) {
            console.log("Got stuck :( '" + tkzr.remainingText + "'");
            break;
        }
        i++;
    }
    return tkzr;
}