import { TokenType } from "../token/tokentypes.js";

export function applySubstitutionToTransform(token) {
    if (token.type == TokenType.INSTRUCTION_BREAK) {
        token.content = ";"
    }
    if (token.type == TokenType.TYPED_NUMBER) {
        // Convert a typed number to number like 'مائة وثلاثة وثلاثون' to '133'
        var words = token.content.split(" ");
        var number = 0;
        var lastDigit = 0;
        for (var word of words) {
            if (word == "و") continue;
            if (word == "مائة") {
                number += lastDigit * 100;
                lastDigit = 0;
            } else if (word == "ألف") {
                number += lastDigit * 1000;
                lastDigit = 0;
            } else if (word == "صفر") {
                lastDigit += 0;
            } else if (word == "واحد") {
                lastDigit += 1;
            } else if (word == "اثنان") {
                lastDigit += 2;
            } else if (word == "ثلاثة") {
                lastDigit += 3;
            } else if (word == "أربعة") {
                lastDigit += 4;
            } else if (word == "خمسة") {
                lastDigit += 5;
            } else if (word == "ستة") {
                lastDigit += 6;
            } else if (word == "سبعة") {
                lastDigit += 7;
            } else if (word == "ثمانية") {
                lastDigit += 8;
            } else if (word == "تسعة") {
                lastDigit += 9;
            } else if (word == "عشرة") {
                lastDigit += 10;
            } else if (word == "أحد عشر") {
                lastDigit += 11;
            } else if (word == "اثنا عشر") {
                lastDigit += 12;
            } else if (word == "ثلاثة عشر") {
                lastDigit += 13;
            } else if (word == "أربعة عشر") {
                lastDigit += 14;
            } else if (word == "خمسة عشر") {
                lastDigit += 15;
            } else if (word == "ستة عشر") {
                lastDigit += 16;
            } else if (word == "سبعة عشر") {
                lastDigit += 17;
            } else if (word == "ثمانية عشر") {
                lastDigit += 18;
            } else if (word == "تسعة عشر") {
                lastDigit += 19;
            } else if (word == "عشرون") {
                lastDigit += 20;
            } else if (word == "ثلاثون") {
                lastDigit += 30;
            } else if (word == "أربعون") {
                lastDigit += 40;
            } else if (word == "خمسون") {
                lastDigit += 50;
            } else if (word == "ستون") {
                lastDigit += 60;
            } else if (word == "سبعون") {
                lastDigit += 70;
            } else if (word == "ثمانون") {
                lastDigit += 80;
            } else if (word == "تسعون") {
                lastDigit += 90;
            }
        }
        number += lastDigit;
        token.content = number.toString();
    } else if (token.type == TokenType.VAR_CHANGE_BY_ONE) {
        if (/^\s*زائد\s*زائد\s*/.test(token.content)) {
            token.content = "++";
        }
        if (/^\s*ناقص\s*ناقص\s*/.test(token.content)) {
            token.content = "--";
        }
    } else if (token.type == TokenType.ASALAM_OLEKUM) {
        token.content = "console.log('السلام عليكم')";

    }
}