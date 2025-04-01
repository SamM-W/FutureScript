//Compile result of Prototype Future Script v3.2
import { Composed } from "../pjs-lib/Composition.js";
import fs from "fs";
var csvContent = fs.readFileSync("./customer/1.csv");
function fizzBuzz(number) {
   if (number % 3 === 0 && number % 5 === 0) {
    return "fizzbuzz";
   } else if (number % 3 === 0) {
    return "fizz";
   } else if (number % 5 === 0) {
    return "buzz";
   } else {
    return number;
  }
}
for (var i = 0;
i < 10;
i++) {
    console.log(fizzBuzz(i));
}
