import { parsePostValue, tokenizeValue } from "./tokenizerValues.js";
import { TokensBuilder } from "./tokens.js";
import { FlagType, TokenType } from "./tokentypes.js";

const INSTRUCTION_BREAK_MATCH = /^[;\n\r]+[\s]*/;

function tokenizeInstruction(tkzr, forceBreak = true) {
    function tokenizeConstructorFunctionBody() {
        tkzr.in()
            .token(TokenType.FUNCTION_OPEN_BRACKETS, /^\([\s]*/)
            .in();

        if (!tkzr.test(/^\)/))
            while (true) {
                tkzr.optionalToken(TokenType.CLASS_CONSTRUCTOR_PROPERTY, /^property[\s]*/);

                var isTypeAnnotated = tkzr.test(/^([a-zA-Z][_a-zA-Z0-9$]*)(\s+[a-zA-Z][_a-zA-Z0-9$]*)\s*(,|\))/);
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
                tokenizeInstruction(tkzr, false);
            }
            tkzr.token(TokenType.CONTROL_BLOCK_CLOSE_BRACKETS, /^\)\s*/)
                .out();
            tokenizeControlBlock();
            tkzr.out();
        })

        .elseOptionalToken(TokenType.BREAK, /^break[\s]*/)
        .elseOptionalToken(TokenType.CONTINUE, /^continue[\s]*/)
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

        .elseOptionalToken(TokenType.FUNCTION_DEFINITION, /^(async)?[\s]*function[\s]+[_a-zA-Z0-9$]+[\s]*(?=\()/, tokenizeFunctionBody)
        
        .elseOptionalDirectFlaggedToken(FlagType.IN_COMPOSED_CLASS_DEFINITION, TokenType.CONSTRUCTOR_FUNCTION_DEFINITION, /^constructor\s*(?=\()/, tokenizeConstructorFunctionBody)
        .elseOptionalDirectFlaggedToken(FlagType.IN_CLASS_DEFINITION, TokenType.CONSTRUCTOR_FUNCTION_DEFINITION, /^constructor\s*(?=\()/, tokenizeConstructorFunctionBody)
        .elseOptionalDirectFlaggedToken(FlagType.IN_CLASS_DEFINITION, TokenType.CONSTRUCTOR_FUNCTION_DEFINITION, /^constructor\s*(?=\()/, tokenizeConstructorFunctionBody)

        .elseOptionalDirectFlaggedToken(FlagType.IN_COMPOSED_CLASS_DEFINITION, TokenType.FUNCTION_DEFINITION, /^(async\s+)?((base)\s+(procedure\s+)?)?[_a-zA-Z0-9$]+\s*(?=\()/, tokenizeFunctionBody)
        .elseOptionalDirectFlaggedToken(FlagType.IN_TRAIT_DEFINITION, TokenType.FUNCTION_DEFINITION, /^(async\s+)?((apply)\s+(procedure\s+)?)?[_a-zA-Z0-9$]+\s*(?=\()/, tokenizeFunctionBody)
        .elseOptionalDirectFlaggedToken(FlagType.IN_CLASS_DEFINITION, TokenType.FUNCTION_DEFINITION, /^(async\s)?\s*[_a-zA-Z0-9$]+\s*(?=\()/, tokenizeFunctionBody)


        //Class definition
        .elseOptionalToken(TokenType.CLASS_DEFINITION, /^(export\s+)?(((composed\s+)?class)|trait)\s+[_a-zA-Z0-9$]+[\s]*(extends\s+[_a-zA-Z0-9$]+\s*)?{\s*/, (token) => {
            var isComposed = /^(export\s*)?(composed\s+)/.test(token.content);
            var isTrait = /^(export)?(trait\s+)/.test(token.content);
            tkzr.in()
            if (isComposed) tkzr.addTokenContextFlag(FlagType.IN_COMPOSED_CLASS_DEFINITION);
            else if (isTrait) tkzr.addTokenContextFlag(FlagType.IN_TRAIT_DEFINITION);
            else tkzr.addTokenContextFlag(FlagType.IN_CLASS_DEFINITION);

            while (!tkzr.test(/^\}\s*/)) {
                tokenizeInstruction(tkzr);
            }

            tkzr.out()
                .token(TokenType.CLASS_DEFINITION_END, /^\}[\s]*/)
                .out();
        })

        //Variable access
        .elseOptionalToken(TokenType.VAR_ACCESS, /^[_a-zA-Z0-9$]+/, () => {
            parsePostValue(tkzr)
            if (tkzr.test(/^(\+\+|\-\-)\s*/)) {
                tkzr.in()
                    .token(TokenType.VAR_CHANGE_BY_ONE, /^(\+\+|\-\-)\s*/)
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
        if (forceBreak) tkzr.metaToken(TokenType.INSTRUCTION_BREAK)
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
            console.error("Fatal error: Got stuck :( '" + tkzr.remainingText + "'");
            break;
        }
        i++;
    }
 
    return tkzr;
}