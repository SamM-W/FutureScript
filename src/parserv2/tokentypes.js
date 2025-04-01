var enumId = 0;
function nextEnum() {
    return enumId++;
}

export const TokenType = {
    VAR_INVOKE: nextEnum(),
    VAR_DEF: nextEnum(),
    VAR_NAME: nextEnum(),
    VAR_EQUALS: nextEnum(),
    VAR_ASSIGN: nextEnum(),
    VAR_ASSIGN_EQUALS: nextEnum(),

    VAR_VALUE: nextEnum(),

    FUNCTION_INVOKE: nextEnum(),
    FUNCTION_OPEN_BRACKETS: nextEnum(),
    FUNCTION_CLOSE_BRACKETS: nextEnum(),
    FUNCTION_DEFINE_NEXT_ARGUMENT: nextEnum(),
    FUNCTION_ARGUMENT_NAME: nextEnum(),
    FUNCTION_INVOKE_NEXT_ARGUMENT: nextEnum(),
    FUNCTION_RETURN: nextEnum(),
    FUNCTION_DEFINITION: nextEnum(),
    
    LAMBDA_FUNCTION_HEADER: nextEnum(),

    VAR_PROPERTY: nextEnum(),

    FUNCTION_OPEN_BLOCK: nextEnum(),
    FUNCTION_CLOSE_BLOCK: nextEnum(),
    FUNCTION_DECLARATION: nextEnum(),
    CLASS_DECLARATION: nextEnum(),
    CLASS_DEFINITION_END: nextEnum(),

    ARRAY_OPEN_BRACKETS: nextEnum(),
    ARRAY_CLOSE_BRACKETS: nextEnum(),
    ARRAY_NEXT_VALUE: nextEnum(),

    ARGUMENT_VALUE: nextEnum(),

    LITERAL_STRING: nextEnum(),
    LITERAL_NUMBER: nextEnum(),

    VALUE_OPEN_BRACKETS: nextEnum(),
    VALUE_CLOSE_BRACKETS: nextEnum(),

    SINGLE_OPERATOR: nextEnum(),
    DOUBLE_OPERATOR: nextEnum(),
    NEGATIVE: nextEnum(),
    TYPEOF: nextEnum(),

    VAR_INDEX_OPEN_BRACKETS: nextEnum(),
    VAR_INDEX_CLOSE_BRACKETS: nextEnum(),

    INSTRUCTION_BREAK: nextEnum(),
};

export const TokenNames = {};
for (var key in TokenType) {
    TokenNames[TokenType[key]] = key;
}

enumId = 0;
export const FlagType = {
    IN_FUNCTION_DEFINITION: nextEnum(),
    IN_CLASS_DEFINITION: nextEnum(),
};


export const FlagNames = {};
for (var key in FlagType) {
    FlagNames[FlagType[key]] = key;
}