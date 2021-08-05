const profileForm = document.getElementById('profile-form')
profileForm.addEventListener('submit', async e => {
   

    // const formData = new FormData(profileForm)
    // const newUsername = formData.get('newUsername')
    // const avatar = formData.get('newAvatar')

    // if (newUsername) {
    //     const result = await (await fetch('/profile/updateUsername', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify({
    //             newUsername: newUsername
    //         })
    //     })).json()

    //     if (result.result == 1) {
    //         //window.location.reload()
    //     }
    // }
    // if (avatar.size) {
    //     const result = await fetch('/profile/updateAvatar', {
    //         method: 'POST',
    //         body: formData
    //     })
    // }

})

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