function switchToFace(face){
    const card = document.getElementById('card')
    card.setAttribute('face', face)
}



const loginForm = document.getElementById('login-form')
loginForm.addEventListener('submit', async e=>{
    e.preventDefault()
    const loginData = new FormData(loginForm)

    const response = await (await fetch('/login', {
        method: 'POST',
        headers:{
            'Content-Type' : 'application/json'
        },
        body:JSON.stringify({
            email: loginData.get('email'),
            password: loginData.get('password')
        })
    })).json()
   

    if(response.result == 1){
        clearForms()
    }else{
        document.getElementById('login-error').innerText = response.message
    }
})




const registerForm = document.getElementById('register-form')
registerForm.addEventListener('submit', async e =>{
    e.preventDefault()
    const registerData = new FormData(registerForm)

    const response  = await(await fetch('/register', {
        method: 'POST',
        headers:{
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username : registerData.get('username'),
            email : registerData.get('email'),
            password: registerData.get('password')
        })
    })).json()
    if(response.result == 1){
        clearForms()
    }
    else {
        document.getElementById('register-error').innerText = response.message
    }
})

function clearForms(){
    registerForm.reset()
    loginForm.reset()
    document.getElementById('register-error').innerText = ''
    document.getElementById('login-error').innerText = ''
}