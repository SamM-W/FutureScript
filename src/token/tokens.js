import { FlagNames, TokenNames } from "./tokentypes.js";

export class Token {
    constructor(type, content) {
        this.type = type;
        this.content = content == null ? null : content.trim();
        this.inner = [];
        this.context = null;
    }

    addInner(token) {
        this.inner.push(token);
    }

    toString() {
        return `Token:${TokenNames[this.type]}{${this.content ? '\"' + this.content + '\"' : this.content}, `+
        `${this.context ? '\"' + FlagNames[this.context] + '\"' : this.context}, `+
        `[${this.inner.length != 0 ? ('\n' + this.inner.join(",\n")).replaceAll("\n", "\n:   ") + '\n' : ''}]}`;
    }
}

function trimStartSpace(text) {
    var spaces = /^[\t ]*/.exec(text);
    return spaces == null ? text : text.substring(spaces[0].length);
}

export class TokensBuilder {

    constructor(text) {
        this.remainingText = trimStartSpace(text);
        this.tokens = [];
        this.tokenNestStack = [];
        this.context = {};
        this.tokenCount = 0;
    }

    addTokenContextFlag(context) {
        this.tokenNestStack[this.tokenNestStack.length-1].context = context;
        return this;
    }
    
    removeParseContextFlag(context) {
        this.tokenNestStack[this.tokenNestStack.length-1].context = context;
        return this;
    }

    hasParseFlag(context) {
        if (this.tokenNestStack.length == 0) return false;
        for (var i = this.tokenNestStack.length-1; i >= 0; i--) {
            if (this.tokenNestStack[i].context == context) return true;
        }
        return false;
    }

    in() {
        if (this.tokenNestStack.length == 0)
            this.tokenNestStack.push(this.tokens[this.tokens.length-1]);
        else {
            var subtoken = this.tokenNestStack[this.tokenNestStack.length-1];
            this.tokenNestStack.push(subtoken.inner[subtoken.inner.length-1])
        }
        return this;
    }

    out() {
        this.tokenNestStack.pop();
        return this;
    }

    addTokenWithoutCapture(tokenType, content) {
        var newToken = new Token(tokenType, content);
        if (this.tokenNestStack.length == 0) {
            this.tokens.push(newToken);
            this.tokenCount++;
        } else {
            this.tokenNestStack[this.tokenNestStack.length-1].addInner(newToken);
        }
        return newToken;
    }

    addToken(tokenType, content) {
        var token = this.addTokenWithoutCapture(tokenType, content);
        if (content != null)
            this.remainingText = trimStartSpace(this.remainingText.substring(content.length));
        return token;
    }

    optionalDirectFlaggedToken(flagType, tokenType, regex, handler) {
        if (this.tokenNestStack.length != 0 && this.tokenNestStack[this.tokenNestStack.length-1].context == flagType) {
            return this.optionalToken(tokenType, regex, handler);
        } else {
            return this.nonConsumedOptionalToken();
        }
    }


    optionalFlaggedToken(flagType, tokenType, regex, handler) {
        if (this.hasParseFlag(flagType)) {
            return this.optionalToken(tokenType, regex, handler);
        } else {
            return this.nonConsumedOptionalToken();
        }
    }

    optionalToken(tokenType, regex, handler) {
        var result = regex.exec(this.remainingText);
        if (result != null) {
            var token = this.addToken(tokenType, result[0]);
            this.lastOptional = true;
            if (handler) handler(token)
            return this.consumedOptionalToken()
        }
        return this.nonConsumedOptionalToken();
    }

    nonConsumedOptionalToken() {
        const nonEmptyOptional = {
            else: (f)=>{f();return this.nonConsumedOptionalToken();},
            elseOptionalToken: (tokenType, regex, handler) =>
                {return this.optionalToken(tokenType, regex, handler);},
            elseOptionalFlaggedToken: (flagType, tokenType, regex, handler) =>
                {return this.optionalFlaggedToken(flagType, tokenType, regex, handler);},
            elseOptionalDirectFlaggedToken: (flagType, tokenType, regex, handler) =>
                {return this.optionalDirectFlaggedToken(flagType, tokenType, regex, handler);},
            elseThrow: (err) => {
                throw err + " in '" + (this.remainingText.length > 20 ? this.remainingText.substring(0, 20) : this.remainingText) + "'";
            },
            didConsume: ()=>{return false;}
        };
        return nonEmptyOptional;
    }

    consumedOptionalToken() {
        const emptyOptional = {
            else: (f)=>{return emptyOptional;},
            elseOptionalToken: (tokenType, regex, handler) =>
                {return emptyOptional;},
            elseOptionalFlaggedToken: (flagType, tokenType, regex, handler) =>
                {return emptyOptional;},
            elseOptionalDirectFlaggedToken: (flagType, tokenType, regex, handler) =>
                {return emptyOptional;},
            elseThrow: (err) => {
            },
            didConsume: ()=>{return true;}
        }
        return emptyOptional;
    }

    token(tokenType, regex) {
        var result = regex.exec(this.remainingText);
        if (result != null) {
            this.addToken(tokenType, result[0]);
            return this;
        }
        throw "Expected token '" + (this.remainingText.length > 20 ? this.remainingText.substring(0, 20) : this.remainingText) + "' " + TokenNames[tokenType];
    }

    metaToken(tokenType) {
        this.addToken(tokenType, null);
        return this;
    }

    test(regex) {
        return regex.test(this.remainingText);
    }

    consumeChar() {
        var consumed = this.remainingText[0];
        this.remainingText = this.remainingText.substring(1);
        return consumed;
    }

    trimRemaining() {
        this.remainingText = trimStartSpace(this.remainingText);
    }

    isEmpty() {
        return this.remainingText == "";
    }
    
}
