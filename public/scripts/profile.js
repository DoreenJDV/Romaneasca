
const settingsForm = document.getElementById('settings-form')
settingsForm.addEventListener('submit', async e => {
    e.preventDefault()

    const formData = new FormData(settingsForm)
    const currentPassword = formData.get('current_password')
    const newPassword = formData.get('new_password')

    if (currentPassword && newPassword) {
        const result = await (await fetch('/profile/updatePassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        })).json()

        const message = document.querySelectorAll('#settings-form .message')[0]
        if (result.result == 1) {
            message.style.color = 'var(--green)'
            message.style.visibility = 'visible'
            message.innerText = result.message
            settingsForm.reset()
        }
        else {
            message.style.color = 'var(--red)'
            message.style.visibility = 'visible'
            message.innerText = result.message
        }
    }
})