//Compile result of Prototype Future Script v3.2
import { Composed } from "../pjs-lib/Composition.js";
class Thomas {
   constructor() {
      this._composed = { expectMethods: [] }
   }
   invoked onUpdate(comp) {
      console.log("Hello");
   }
}
