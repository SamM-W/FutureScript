//Compile result of Prototype Future Script v3.2
import { Composed } from "../pjs-lib/Composition.js";
import fs from "fs";
import path from "path";
class CustomerData {

   getFirstName() {
      return this.firstName;
   }

   setFirstName(firstName) {
      this.firstName = firstName;
   }

   getLastName() {
      return this.lastName;
   }

   setLastName(lastName) {
      this.lastName = lastName;
   }

   getCustomerID() {
      return this.customerID;
   }

   setCustomerID(customerID) {
      this.customerID = customerID;
   }

   getEmail() {
      return this.email;
   }

   setEmail(email) {
      this.email = email;
   }
   constructor(firstName, lastName, customerID, email) {
      this.firstName = firstName;
      this.lastName = lastName;
      this.customerID = customerID;
      this.email = email;
      this._composed = { expectMethods: [] }
   }
   getFieldsForSerialisation(comp) {
      return {
            firstName: this.firstName, lastName: this.lastName, customerID: this.customerID, email: this.email
        }
   }
}
class TextFileOutput {

   getTargetFile() {
      return this.targetFile;
   }

   setTargetFile(targetFile) {
      this.targetFile = targetFile;
   }
   constructor(targetFile) {
      this.targetFile = targetFile;
      this._composed = { expectMethods: ["getTextForFileOutput"] }
   }
   write(comp) {
      var content = comp.getTextForFileOutput();
      fs.mkdirSync(path.dirname(this.targetFile), { recursive: true });
      fs.writeFileSync(this.targetFile, content);
   }
}
class CSVWriter {
   constructor() {
      this._composed = { expectMethods: ["getFieldsForSerialisation"] }
   }
   getTextForFileOutput(comp) {
      var fields = comp.getFieldsForSerialisation();
      console.log(fields);
      var values = [];
      for (var key in fields) {
            values.push(fields[key]);
      }
        return values.join(",");
   }
}
class YMLWriter {
   constructor() {
      this._composed = { expectMethods: ["getFieldsForSerialisation"] }
   }
   getTextForFileOutput(comp) {
      var fields = comp.getFieldsForSerialisation();
      var content = "";
      for (var key in fields) {
            content += `${key}: ${fields[key]}\n`
        }
        return content;
   }
}
function createCSVCustomer(firstName, lastName, customerID, email) {
   return new Composed(
        new CustomerData(firstName, lastName, customerID, email),
        new TextFileOutput("./customer/" + customerID + ".csv"),
        new CSVWriter()
    )
}
function createYMLCustomer(firstName, lastName, customerID, email) {
   return new Composed(
        new CustomerData(firstName, lastName, customerID, email),
        new TextFileOutput("./customer/" + customerID + ".yml"),
        new YMLWriter()
    )
}
var customer1 = createCSVCustomer("Charlie", "Sirperator", 1, "customer1@example.com");
var customer2 = createYMLCustomer("Alex", "Sirperator", 2, "customer1@example.com");
var customers = [customer1, customer2];
for (var customer of customers) {
    if (customer.write)
        customer.write();
}
