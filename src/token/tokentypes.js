var enumId = 0;
function nextEnum() {
    return enumId++;
}

export const TokenType = {
    VAR_INVOKE: nextEnum(),
    VAR_DEF: nextEnum(),
    VAR_NAME: nextEnum(),
    VAR_EQUALS: nextEnum(),
    VAR_ACCESS: nextEnum(),
    VAR_ASSIGN_EQUALS: nextEnum(),

    VAR_VALUE: nextEnum(),
    TYPED_NUMBER: nextEnum(),

    FUNCTION_INVOKE: nextEnum(),
    FUNCTION_OPEN_BRACKETS: nextEnum(),
    FUNCTION_CLOSE_BRACKETS: nextEnum(),
    FUNCTION_DEFINE_NEXT_ARGUMENT: nextEnum(),
    FUNCTION_ARGUMENT_NAME: nextEnum(),
    FUNCTION_ARGUMENT_TYPE: nextEnum(),
    FUNCTION_INVOKE_NEXT_ARGUMENT: nextEnum(),
    FUNCTION_RETURN: nextEnum(),
    FUNCTION_DEFINITION: nextEnum(),
    CONSTRUCTOR_FUNCTION_DEFINITION: nextEnum(),

    CONTINUE: nextEnum(),
    BREAK: nextEnum(),
    THROW: nextEnum(),
    
    LAMBDA_FUNCTION_HEADER: nextEnum(),

    VAR_PROPERTY: nextEnum(),

    CONTROL_BLOCK_OPEN_BRACKETS: nextEnum(),
    CONTROL_BLOCK_CLOSE_BRACKETS: nextEnum(),

    OPEN_CODE_BLOCK: nextEnum(),
    CLOSE_CODE_BLOCK: nextEnum(),
    
    CONTROL_BLOCK_IF: nextEnum(),
    CONTROL_BLOCK_FOR: nextEnum(),
    CONTROL_BLOCK_WHILE: nextEnum(),
    
    CONTROL_BLOCK_FOR_ITTERATION_TYPE: nextEnum(),

    FUNCTION_DECLARATION: nextEnum(),
    CLASS_DEFINITION: nextEnum(),
    CLASS_DEFINITION_END: nextEnum(),

    CLASS_CONSTRUCTOR_PROPERTY: nextEnum(),

    ARRAY_OPEN_BRACKETS: nextEnum(),
    ARRAY_CLOSE_BRACKETS: nextEnum(),
    ARRAY_NEXT_VALUE: nextEnum(),
    
    MAP_OPEN_BRACKETS: nextEnum(),
    MAP_CLOSE_BRACKETS: nextEnum(),
    MAP_NEXT_VALUE: nextEnum(),
    MAP_ENTRY_TOKEN: nextEnum(),
    MAP_ASSIGNMENT: nextEnum(),

    ARGUMENT_VALUE: nextEnum(),
    SPACE: nextEnum(),

    LITERAL_STRING: nextEnum(),
    LITERAL_NUMBER: nextEnum(),

    VALUE_OPEN_BRACKETS: nextEnum(),
    VALUE_CLOSE_BRACKETS: nextEnum(),

    SINGLE_OPERATOR: nextEnum(),
    MULTI_OPERATOR: nextEnum(),
    NOT: nextEnum(),
    NEGATIVE: nextEnum(),
    TYPEOF: nextEnum(),
    INSTANCEOF: nextEnum(),
    OBJECT_EXPANSION: nextEnum(),

    VAR_INDEX_OPEN_BRACKETS: nextEnum(),
    VAR_INDEX_CLOSE_BRACKETS: nextEnum(),

    INSTRUCTION_BREAK: nextEnum(),
    VAR_CHANGE_BY_ONE: nextEnum(),
    INLINE_IF_TRUE: nextEnum(),
    INLINE_IF_FALSE: nextEnum(),
    INLINE_NULL_CHECK: nextEnum(),
    CONSTRUCTOR_INVOKE: nextEnum(),
    CODE_INJECT: nextEnum(), //Used by the transformer to inject code into the result, not a parsable token
};

export const TokenNames = {};
for (var key in TokenType) {
    TokenNames[TokenType[key]] = key;
}

enumId = 0;
export const FlagType = {
    IN_ENHANCED_FOR_DEFINITION: nextEnum(),
    IN_NUMERICAL_FOR_DEFINITION: nextEnum(),

    IN_ITTERATION_DEFINITION: nextEnum(),
    IN_FUNCTION_DEFINITION: nextEnum(),
    IN_CLASS_DEFINITION: nextEnum(),
    IN_COMPOSED_CLASS_DEFINITION: nextEnum(),
    IN_TRAIT_DEFINITION: nextEnum(),
};


export const FlagNames = {};
for (var key in FlagType) {
    FlagNames[FlagType[key]] = key;
}