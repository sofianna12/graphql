
import { signin } from "./api.js";


const form = document.querySelector("#login-form");

form.addEventListener("submit", async (event) => {
  
  event.preventDefault();

  try {
    
    // trim() removes accidental spaces; never trim the password
    const identifier = document.querySelector("#identifier").value.trim();
    const password = document.querySelector("#password").value;
    
    const token = await signin(identifier, password);
    
    console.log(token);

  } catch (error) {
    
    console.error(error);
  }
});
