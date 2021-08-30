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
        window.location.href ='/'
    }else{
        const loginError = document.getElementById('login-error')
        loginError.innerText = response.message
        loginError.style.visibility = 'visible'
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
        window.location.href='/'
    }
    else {
        const registerError = document.getElementById('register-error')
        registerError.innerText = response.message
        registerError.style.visibility = 'visible'
    }
})

function clearForms(){
    registerForm.reset()
    loginForm.reset()
    document.getElementById('register-error').innerText = ''
    document.getElementById('login-error').innerText = ''
}