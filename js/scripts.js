// Global data storage
const userData = {
    personal: {},
    requirements: {
        terms: false,
        money: false,
        paymentMethod: null,
        video: false
    },
    payment: {
        consultation: false,
        code: null,
        date: null
    },
    role: {
        selected: null,
        price: null,
        date: null
    },
    timeline: {
        registration: null,
        payment: null,
        roleSelection: null
    }
};

// Current step management
let currentStep = 1;
let currentTourCard = 1;
let paymentConfirmed = false;

// Video play functionality
function playVideo(element, videoUrl) {
    const container = element.closest('.video-container');
    const preview = container.querySelector('.video-preview');
    
    // Hide preview and placeholder
    if (preview) {
        preview.style.display = 'none';
    }
    element.style.display = 'none';
    
    // Check if video already exists in container (avoid duplicates)
    const existingVideo = container.querySelector('video:not(.video-preview)');
    if (existingVideo) {
        existingVideo.style.display = 'block';
        existingVideo.play();
        return;
    }
    
    // Create video element for playback
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.position = "absolute";
    video.style.top = "0";
    video.style.left = "0";
    video.style.objectFit = "contain";
    video.style.zIndex = "3";
    
    // Create source element
    const source = document.createElement('source');
    source.src = videoUrl;
    source.type = "video/mp4";
    video.appendChild(source);
    
    // Add error handling
    video.addEventListener('error', function(e) {
        console.error('Video error:', e);
        alert('Error loading video. Please check the video path: ' + videoUrl);
    });
    
    container.appendChild(video);
    
    // Play the video
    video.play().catch(function(error) {
        console.error('Video play error:', error);
        // If autoplay fails, user can click play button
    });
}

// Initialize video previews at 2 seconds
function initializeVideoPreviews() {
    const videoPreviews = document.querySelectorAll('.video-preview');
    
    videoPreviews.forEach(video => {
        video.addEventListener('loadedmetadata', function() {
            // Seek to 2 seconds once metadata is loaded
            if (this.duration >= 2) {
                this.currentTime = 2;
            } else if (this.duration > 0) {
                // If video is shorter than 2 seconds, use half duration
                this.currentTime = this.duration / 2;
            }
        });
        
        video.addEventListener('seeked', function() {
            // Video has been seeked to 2 seconds, show the frame
            this.style.opacity = '1';
            this.style.display = 'block';
        });
        
        video.addEventListener('error', function(e) {
            console.error('Video preview error:', e, this.src);
            // Hide preview on error, show placeholder
            this.style.display = 'none';
        });
        
        // Load the video metadata
        video.load();
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeProgressBar();
    initializeVideoPreviews();
    loadUserData();
    updateTourCounter();
    
    // Set current date for registration
    userData.timeline.registration = new Date().toLocaleString();
    
    // Load saved data from localStorage
    const savedData = localStorage.getItem('userRegistrationData');
    if (savedData) {
        Object.assign(userData, JSON.parse(savedData));
        updateUIFromData();
    }

    // Prevent the form from submitting with Enter or default submit
    const regForm = document.getElementById('registrationForm');
    if (regForm) {
        regForm.addEventListener('submit', function(e) { e.preventDefault(); });
        regForm.addEventListener('keydown', function(e) { if (e.key === 'Enter') e.preventDefault(); });
    }
});

// Progress bar functions
function initializeProgressBar() {
    const progressBar = document.querySelector('.progress-bar');
    const steps = document.querySelectorAll('.step');
    
    steps.forEach(step => {
        step.addEventListener('click', function() {
            const stepNumber = parseInt(this.getAttribute('data-step'));
            goToStep(stepNumber);
        });
    });
    
    updateProgressBar();
}

function updateProgressBar() {
    const progressBar = document.querySelector('.progress-bar');
    progressBar.className = 'progress-bar';
    progressBar.classList.add(`step${currentStep}`);
    
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNumber === currentStep) {
            step.classList.add('active');
        } else if (stepNumber < currentStep) {
            step.classList.add('completed');
        }
    });
}

// Step navigation functions
function nextStep(step) {
    if (validateCurrentStep()) {
        goToStep(step);
    }
}

function prevStep(step) {
    goToStep(step);
}

function goToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show selected step
    const stepElement = document.getElementById(`step${stepNumber}`);
    if (stepElement) {
        stepElement.classList.add('active');
        currentStep = stepNumber;
        updateProgressBar();
        
        // Initialize requirements if step 3
        if (stepNumber === 3) {
            initializeRequirements();
        }
        
        // Scroll to top of step
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Update summary if on step 7
        if (stepNumber === 7) {
            updateSummary();
        }
    }
}

function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            return validateRegistrationForm();
        case 3:
            return validateRequirements();
        case 4:
            return validatePayment();
        case 5:
            return true; // Always valid
        case 6:
            return validateRoleSelection();
        default:
            return true;
    }
}

// Step 1: Registration Form
function validateRegistrationForm() {
    const form = document.getElementById('registrationForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    let firstInvalid = null;

    requiredFields.forEach(field => {
        let valid = true;
        // Handle checkboxes explicitly
        if (field.type === 'checkbox') {
            if (!field.checked) valid = false;
        } else {
            if (!field.value || !field.value.toString().trim()) valid = false;
        }

        if (!valid) {
            field.style.borderColor = 'var(--danger-color)';
            if (!firstInvalid) firstInvalid = field;
            isValid = false;
        } else {
            field.style.borderColor = '#e2e8f0';
        }
    });
    
    if (firstInvalid) {
        // focus the first invalid control for better UX
        try { firstInvalid.focus(); } catch(e) {}
    }
    
    if (isValid) {
        saveRegistrationData();
        return true;
    } else {
        showNotification('Please fill all required fields', 'error');
        return false;
    }
}

function saveRegistrationData() {
    const form = document.getElementById('registrationForm');
    userData.personal = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        typeOfProduct: document.getElementById('typeOfProduct').value,
        acceptableDocument: document.getElementById('acceptableDocument').value
    };
    
    // Save to localStorage
    saveToLocalStorage();
    
    showNotification('Registration data saved successfully', 'success');
}

// Step 2: Company Tour
function nextTourCard() {
    if (currentTourCard < 7) {
        currentTourCard++;
        updateTourDisplay();
    }
}

function prevTourCard() {
    if (currentTourCard > 1) {
        currentTourCard--;
        updateTourDisplay();
    }
}

function goToTourCard(cardNumber) {
    currentTourCard = cardNumber;
    updateTourDisplay();
}

function updateTourDisplay() {
    // Hide all cards
    document.querySelectorAll('.tour-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Show current card
    const currentCard = document.getElementById(`tourCard${currentTourCard}`);
    if (currentCard) {
        currentCard.classList.add('active');
    }
    
    // Update counter
    updateTourCounter();
    
    // Update dots
    document.querySelectorAll('.tour-dot').forEach((dot, index) => {
        dot.classList.remove('active');
        if (index === currentTourCard - 1) {
            dot.classList.add('active');
        }
    });
}

function updateTourCounter() {
    const counter = document.getElementById('tourCounter');
    if (counter) {
        counter.textContent = `Card ${currentTourCard} of 7`;
    }
}

// Requirements Navigation Variables
let currentRequirement = 1;
const totalRequirements = 4;

// Initialize requirements when step 3 loads
function initializeRequirements() {
    currentRequirement = 1;
    updateRequirementDisplay();
    updateRequirementsProgress();
}

// Requirement Navigation Functions
function nextRequirement() {
    if (currentRequirement < totalRequirements) {
        currentRequirement++;
        updateRequirementDisplay();
    }
}

function prevRequirement() {
    if (currentRequirement > 1) {
        currentRequirement--;
        updateRequirementDisplay();
    }
}

function goToRequirement(reqNumber) {
    currentRequirement = reqNumber;
    updateRequirementDisplay();
}

function updateRequirementDisplay() {
    // Hide all requirement cards
    document.querySelectorAll('.requirement-card').forEach(card => {
        card.classList.remove('active');
        card.style.animation = 'slideInRight 0.5s ease';
    });
    
    // Show current requirement card
    const currentCard = document.getElementById(`reqCard${currentRequirement}`);
    if (currentCard) {
        currentCard.classList.add('active');
        
        // Set animation direction based on navigation
        if (currentRequirement > 1) {
            currentCard.style.animation = 'slideInRight 0.5s ease';
        } else {
            currentCard.style.animation = 'slideInLeft 0.5s ease';
        }
    }
    
    // Update counter
    updateRequirementCounter();
    
    // Update dots
    document.querySelectorAll('.req-dot').forEach((dot, index) => {
        const reqNumber = index + 1;
        dot.classList.remove('active');
        
        // Add completed class if requirement is confirmed
        if (reqNumber === 1 && userData.requirements.terms) {
            dot.classList.add('completed');
        } else if (reqNumber === 2 && userData.requirements.money) {
            dot.classList.add('completed');
        } else if (reqNumber === 3 && userData.requirements.paymentMethod) {
            dot.classList.add('completed');
        } else if (reqNumber === 4 && userData.requirements.video) {
            dot.classList.add('completed');
        }
        
        if (reqNumber === currentRequirement) {
            dot.classList.add('active');
        }
    });
    
    // Update navigation buttons
    const prevBtn = document.querySelector('.req-nav-btn:first-child');
    const nextBtn = document.querySelector('.req-nav-btn:last-child');
    
    if (prevBtn) {
        prevBtn.disabled = currentRequirement === 1;
        prevBtn.style.opacity = currentRequirement === 1 ? '0.5' : '1';
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentRequirement === totalRequirements;
        nextBtn.style.opacity = currentRequirement === totalRequirements ? '0.5' : '1';
        
        // Update next button text for last requirement
        if (currentRequirement === totalRequirements) {
            nextBtn.innerHTML = 'Complete <i class="fas fa-check"></i>';
        } else {
            nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
        }
    }
}

function updateRequirementCounter() {
    const counter = document.getElementById('reqCounter');
    if (counter) {
        const requirementNames = [
            'Terms & Conditions',
            'Money Availability',
            'Payment Methods',
            'Video Explanation'
        ];
        counter.textContent = `Requirement ${currentRequirement} of ${totalRequirements}: ${requirementNames[currentRequirement - 1]}`;
    }
}

function updateRequirementsProgress() {
    let completedCount = 0;
    
    if (userData.requirements.terms) completedCount++;
    if (userData.requirements.money) completedCount++;
    if (userData.requirements.paymentMethod) completedCount++;
    if (userData.requirements.video) completedCount++;
    
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('requirementsProgress');
    
    if (progressText) {
        progressText.textContent = `${completedCount} of ${totalRequirements} requirements completed`;
    }
    
    if (progressFill) {
        const percentage = (completedCount / totalRequirements) * 100;
        progressFill.style.width = `${percentage}%`;
    }
    
    // Enable/disable next step button based on completion
    const step3NextBtn = document.getElementById('step3Next');
    if (step3NextBtn) {
        step3NextBtn.disabled = completedCount < totalRequirements;
    }
}

// Modified confirmRequirement function
function confirmRequirement(reqNumber, confirmed) {
    const statusElement = document.getElementById(`status${reqNumber}`);
    const cardElement = document.getElementById(`reqCard${reqNumber}`);
    
    if (confirmed) {
        statusElement.textContent = 'Completed';
        statusElement.className = 'req-status completed';
        cardElement.classList.add('completed');
        cardElement.classList.remove('failed');
        
        // Update user data
        switch(reqNumber) {
            case 1:
                userData.requirements.terms = true;
                break;
            case 2:
                userData.requirements.money = true;
                break;
            case 3:
                userData.requirements.paymentMethod = getSelectedPaymentMethod();
                break;
            case 4:
                userData.requirements.video = true;
                break;
        }
        
        showNotification('Requirement confirmed successfully!', 'success');
        
        // Auto-advance to next requirement if not the last one
        if (reqNumber < totalRequirements) {
            setTimeout(() => {
                nextRequirement();
            }, 1000);
        }
        
    } else {
        statusElement.textContent = 'Failed';
        statusElement.className = 'req-status failed';
        cardElement.classList.add('failed');
        cardElement.classList.remove('completed');
        
        showNotification('Requirement not confirmed', 'error');
        
        // If requirement 1 or 2 is not confirmed, show warning
        if (reqNumber === 1 || reqNumber === 2) {
            setTimeout(() => {
                showNotification('You must complete all requirements to proceed', 'warning');
            }, 1000);
        }
    }
    
    // Update progress
    updateRequirementsProgress();
    
    // Update dots to show completed status
    const dot = document.querySelectorAll('.req-dot')[reqNumber - 1];
    if (dot && confirmed) {
        dot.classList.add('completed');
    } else if (dot) {
        dot.classList.remove('completed');
    }
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Check if all requirements are completed
    checkRequirementsCompletion();
}

function getSelectedPaymentMethod() {
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
    return selectedMethod ? selectedMethod.value : null;
}

// Modified selectPaymentMethod function
function selectPaymentMethod(method) {
    const methodNames = {
        'momo': 'Bank Transfer',
        'mtn': 'MTN Mobile Money',
        'cash': 'Cash',
        'visa': 'Visa Card',
        'mastercard': 'Master Card'
    };
    
    userData.requirements.paymentMethod = method;
    showNotification(`${methodNames[method]} payment method selected`, 'success');
    // Clear any previously generated payment confirmation code when method changes
    if (userData.payment && userData.payment.generatedCode) {
        delete userData.payment.generatedCode;
        const paymentCodeContainer = document.getElementById('paymentCodeContainer');
        const paymentCode = document.getElementById('paymentCode');
        const confirmationGroup = document.getElementById('confirmationGroup');
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        const paidBtn = document.getElementById('paidBtn');
        if (paymentCode) paymentCode.textContent = '';
        if (paymentCodeContainer) paymentCodeContainer.style.display = 'none';
        if (confirmationGroup) confirmationGroup.style.display = 'none';
        if (confirmBtn) confirmBtn.disabled = true;
        if (paidBtn) paidBtn.disabled = false;
    }
    saveToLocalStorage();
    
    // Update progress
    updateRequirementsProgress();
}

function checkRequirementsCompletion() {
    const allCompleted = 
        userData.requirements.terms &&
        userData.requirements.money &&
        userData.requirements.paymentMethod &&
        userData.requirements.video;
    
    if (allCompleted) {
        showNotification('All requirements completed! You can proceed to next step.', 'success');
    }
}

function validateRequirements() {
    if (!userData.requirements.terms) {
        showNotification('Please accept the terms and conditions', 'error');
        goToRequirement(1);
        return false;
    }
    if (!userData.requirements.money) {
        showNotification('Please confirm money availability', 'error');
        goToRequirement(2);
        return false;
    }
    if (!userData.requirements.paymentMethod) {
        showNotification('Please select a payment method', 'error');
        goToRequirement(3);
        return false;
    }
    if (!userData.requirements.video) {
        showNotification('Please watch the explanation video', 'error');
        goToRequirement(4);
        return false;
    }
    return true;
}

// Step 4: Consultation Payment
function togglePaymentDetails() {
    const directPayment = document.getElementById('directPayment');
    const paymentDetails = document.getElementById('paymentDetails');
    
    if (directPayment.checked) {
        paymentDetails.style.display = 'block';
        renderPaymentDetails();
    } else {
        paymentDetails.style.display = 'none';
        const confirmBtn = document.getElementById('step4Next');
        if (confirmBtn) {
            confirmBtn.disabled = true;
        }
    }
}

// Render payment details based on previously selected method
function renderPaymentDetails() {
    const method = userData.requirements.paymentMethod || getSelectedPaymentMethod();
    const container = document.getElementById('selectedPaymentDetails');
    const paymentDetails = document.getElementById('paymentDetails');

    if (!container) return;

    if (!method) {
        container.innerHTML = `
            <div class="payment-code-info">
                <h4><i class="fas fa-exclamation-circle"></i> No payment method selected</h4>
                <p class="code-info-text">Please choose a payment method in Step 3 before proceeding. <button class="btn btn-secondary" onclick="prevStep(3)">Choose Method</button></p>
            </div>`;
        // disable actions
        document.getElementById('paidBtn').disabled = true;
        document.getElementById('changeMethodBtn').disabled = false;
        return;
    }

    document.getElementById('paidBtn').disabled = false;

    // Build method-specific content
    let html = '';
    switch (method) {
        case 'momo':
            html = `
                <div class="payment-code-info">
                    <h4><i class="fas fa-university"></i> Bank Transfer</h4>
                    <div class="code-display-large">1002421423486</div>
                    <p class="code-info-text">Make a bank transfer to the account above. After transferring, click "I've Paid (Generate Code)" to get a confirmation code and enter it in the confirmation field below.</p>
                </div>`;
            break;
        case 'mtn':
            html = `
                <div class="payment-code-info">
                    <h4><i class="fas fa-mobile-alt"></i> MTN Mobile Money</h4>
                    <div class="code-display-large">0781234567</div>
                    <p class="code-info-text">Send your MTN Mobile Money payment to the number above. After sending, click "I've Paid (Generate Code)" to get a confirmation code and enter it in the confirmation field below.</p>
                </div>`;
            break;
        case 'cash':
            html = `
                <div class="payment-code-info">
                    <h4><i class="fas fa-money-bill"></i> Cash Payment</h4>
                    <p class="code-info-text">Visit our office to make cash payment. After paying, click "I've Paid (Generate Code)" to generate a confirmation code and enter it in the confirmation field below.</p>
                </div>`;
            break;
        case 'visa':
        case 'mastercard':
            const cardType = method.charAt(0).toUpperCase() + method.slice(1);
            html = `
                <div class="payment-code-info">
                    <h4><i class="fas fa-credit-card"></i> ${cardType} Payment</h4>
                    <p class="code-info-text">You will be redirected to your card provider. After completing payment, click "I've Paid (Generate Code)" to generate a confirmation code and enter it in the confirmation field below.</p>
                </div>`;
            break;
        default:
            html = `
                <div class="payment-code-info">
                    <h4><i class="fas fa-info-circle"></i> Payment</h4>
                    <p class="code-info-text">Follow the instructions for the selected payment method. After paying, click "I've Paid (Generate Code)" to get a confirmation code.</p>
                </div>`;
    }

    container.innerHTML = html;

    // Hide previous generated code or reset confirmation UI
    const codeContainer = document.getElementById('paymentCodeContainer');
    if (codeContainer) {
        if (userData.payment.generatedCode) {
            codeContainer.style.display = 'block';
            codeContainer.classList.add('show');
            const paymentCode = document.getElementById('paymentCode');
            if (paymentCode) paymentCode.classList.add('animate');
        } else {
            codeContainer.style.display = 'none';
            codeContainer.classList.remove('show');
            const paymentCode = document.getElementById('paymentCode');
            if (paymentCode) paymentCode.classList.remove('animate');
        }
    }
    const confirmationGroup = document.getElementById('confirmationGroup');
    if (confirmationGroup) confirmationGroup.style.display = 'block';
}

// Called when the user clicks "I've Paid"
function handlePaidClick() {
    const method = userData.requirements.paymentMethod || getSelectedPaymentMethod();
    if (!method) {
        showNotification('Please select a payment method first.', 'error');
        return;
    }

    // Simulate generation of a payment confirmation code by external provider
    const generated = generateRandomConfirmationCode();
    userData.payment.generatedCode = generated;
    // Show the generated code so user can copy/paste into confirmation input
    const paymentCodeContainer = document.getElementById('paymentCodeContainer');
    const paymentCode = document.getElementById('paymentCode');
    const confirmInput = document.getElementById('confirmationInput');
    const confirmBtn = document.getElementById('confirmPaymentBtn');

    if (paymentCode && paymentCodeContainer) {
        paymentCode.textContent = generated;
        paymentCodeContainer.style.display = 'block';
        paymentCode.classList.add('animate');
        paymentCodeContainer.classList.add('show');
    }

    // Copy to clipboard for convenience
    try {
        navigator.clipboard.writeText(generated);
        showNotification('Confirmation code generated and copied to clipboard. Paste it into the confirmation field to verify.', 'info');
    } catch (e) {
        showNotification('Confirmation code generated. Copy it and paste into the confirmation field to verify.', 'info');
    }

    // Show confirmation field and enable confirm button
    const confirmationGroup = document.getElementById('confirmationGroup');
    if (confirmationGroup) confirmationGroup.style.display = 'block';
    if (confirmBtn) confirmBtn.disabled = false;

    // Persist generated code temporarily
    saveToLocalStorage();
}

function generateRandomConfirmationCode() {
    return 'PAY-' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

function confirmPayment() {
    const entered = document.getElementById('confirmationInput') ? document.getElementById('confirmationInput').value.trim() : '';
    const expected = userData.payment.generatedCode || userData.payment.code;

    if (!expected) {
        showNotification('No confirmation code generated yet. Click "I\'ve Paid" to generate one.', 'error');
        return;
    }

    if (!entered) {
        showNotification('Please enter the confirmation code to verify payment.', 'error');
        return;
    }

    if (entered !== expected) {
        showNotification('The confirmation code does not match. Please try again.', 'error');
        return;
    }

    showLoading(true);

    // Simulate server verification
    setTimeout(() => {
        userData.payment.consultation = true;
        userData.payment.code = entered;
        userData.payment.date = new Date().toLocaleString();
        userData.timeline.payment = userData.payment.date;

        const nextButton = document.getElementById('step4Next');
        if (nextButton) {
            nextButton.disabled = false;
        }

        // Stop pulsing animation and mark confirmed
        const paymentCodeEl = document.getElementById('paymentCode');
        const paymentCodeContainer = document.getElementById('paymentCodeContainer');
        if (paymentCodeEl) paymentCodeEl.classList.remove('animate');
        if (paymentCodeContainer) paymentCodeContainer.classList.add('confirmed');

        saveToLocalStorage();
        showLoading(false);
        showNotification('Payment confirmed successfully!', 'success');

        // Update payment status
        const btn = document.getElementById('confirmPaymentBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Payment Confirmed';
            btn.disabled = true;
        }

        // Disable paid button and change method to prevent accidental changes
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) paidBtn.disabled = true;
        const changeBtn = document.getElementById('changeMethodBtn');
        if (changeBtn) changeBtn.disabled = true;

        // Mark directPayment checkbox as disabled
        const direct = document.getElementById('directPayment');
        if (direct) direct.disabled = true;

        // Clear generated code from memory (leave stored confirmation code)
        delete userData.payment.generatedCode;
        saveToLocalStorage();
    }, 1200);
}

function noPayment() {
    showNotification('Payment is required to proceed. Returning to previous step...', 'error');
    setTimeout(() => {
        goToStep(3);
    }, 2000);
}

function validatePayment() {
    if (!userData.payment.consultation) {
        showNotification('Please complete the payment process', 'error');
        return false;
    }
    return true;
}

// Step 5: User Roles
function selectRole(roleType) {
    const roleCards = document.querySelectorAll('.role-card');
    roleCards.forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.getElementById(`${roleType}Role`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Enable next button
    const nextButton = document.getElementById('step5Next');
    if (nextButton) {
        nextButton.disabled = false;
    }
    
    showNotification(`${roleType.charAt(0).toUpperCase() + roleType.slice(1)} role selected`, 'success');
}

// Step 6: Choose Role
function finalizeRoleSelection(roleType) {
    const roleOptions = document.querySelectorAll('.role-option');
    roleOptions.forEach(option => {
        option.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`.role-option[onclick="finalizeRoleSelection('${roleType}')"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Update display
    const display = document.getElementById('selectedRoleDisplay');
    const icon = display.querySelector('.role-icon i');
    const title = display.querySelector('.role-info h3');
    const desc = display.querySelector('.role-info p');
    
    let roleData = {};
    let roleColor = '';
    switch(roleType) {
        case 'basic':
            roleData = { icon: 'fas fa-star', title: 'Basic Role', desc: 'For individuals getting started', price: '-' };
            roleColor = 'rgb(4, 156, 62)';
            break;
        case 'standard':
            roleData = { icon: 'fas fa-gem', title: 'Standard Role', desc: 'For growing businesses', price: '-' };
            roleColor = 'rgb(25, 88, 164)';
            break;
        case 'premium':
            roleData = { icon: 'fas fa-crown', title: 'Premium Role', desc: 'For enterprise solutions', price: '-' };
            roleColor = 'rgb(238, 181, 11)';
            break;
    }
    
    icon.className = roleData.icon;
    if (icon) {
        icon.style.color = roleColor;
    }
    title.textContent = roleData.title;
    desc.textContent = roleData.desc;

    // Update selected price display
    const selectedPriceEl = document.getElementById('selectedRolePrice');
    if (selectedPriceEl) selectedPriceEl.textContent = roleData.price;
    
    // Add selected class to display container and update border color
    if (display) {
        display.classList.add('selected');
        display.style.borderColor = roleColor;
    }
    
    // Update role icon background color
    const roleIconDiv = display.querySelector('.role-icon');
    if (roleIconDiv) {
        roleIconDiv.style.backgroundColor = roleColor + '15'; // Add transparency
        roleIconDiv.style.color = roleColor;
    }
    
    // Finalize selection: set role, save, enable Next
    userData.role.selected = roleType;
    userData.role.price = roleData.price;
    userData.role.date = new Date().toLocaleString();
    userData.timeline.roleSelection = userData.role.date;
    saveToLocalStorage();

    // Enable step 6 Next button
    const nextBtn = document.getElementById('step6Next');
    if (nextBtn) nextBtn.disabled = false;

    // Allow users to change selection - users can now change between basic, standard, and premium as needed
}

function validateRoleSelection() {
    if (!userData.role.selected) {
        showNotification('Please select a role', 'error');
        return false;
    }
    return true;
}

// Step 7: Summary & Export
function updateSummary() {
    // Personal Information
    document.getElementById('summaryName').textContent = 
        `${userData.personal.firstName || '-'} ${userData.personal.lastName || '-'}`;
    document.getElementById('summaryEmail').textContent = userData.personal.email || '-';
    document.getElementById('summaryPhone').textContent = userData.personal.phone || '-';
    document.getElementById('summaryAddress').textContent = userData.personal.address || '-';
    document.getElementById('summaryTypeOfProduct').textContent = userData.personal.typeOfProduct || '-';
    document.getElementById('summaryAcceptableDocument').textContent = userData.personal.acceptableDocument || '-';
    
    // Requirements
    document.getElementById('summaryTerms').textContent = userData.requirements.terms ? 'Yes' : 'No';
    document.getElementById('summaryTerms').style.color = userData.requirements.terms ? 'var(--success-color)' : 'var(--danger-color)';
    document.getElementById('summaryMoney').textContent = userData.requirements.money ? 'Yes' : 'No';
    document.getElementById('summaryMoney').style.color = userData.requirements.money ? 'var(--success-color)' : 'var(--danger-color)';
    document.getElementById('summaryPaymentMethod').textContent = userData.requirements.paymentMethod ? userData.requirements.paymentMethod.toUpperCase() : '-';
    document.getElementById('summaryVideo').textContent = userData.requirements.video ? 'Yes' : 'No';
    document.getElementById('summaryVideo').style.color = userData.requirements.video ? 'var(--success-color)' : 'var(--danger-color)';
    
    // Payment
    document.getElementById('summaryPayment').textContent = userData.payment.consultation ? 'Yes' : 'No';
    document.getElementById('summaryPayment').style.color = userData.payment.consultation ? 'var(--success-color)' : 'var(--danger-color)';
    document.getElementById('summaryPaymentCode').textContent = userData.payment.code || '-';
    document.getElementById('summaryPaymentDate').textContent = userData.payment.date || '-';
    
    // Role
    document.getElementById('summaryRole').textContent = userData.role.selected ? 
        userData.role.selected.charAt(0).toUpperCase() + userData.role.selected.slice(1) : '-';
    document.getElementById('summaryRolePrice').textContent = userData.role.price || '-';
    document.getElementById('summaryRoleDate').textContent = userData.role.date || '-';
    
    // Timeline
    document.getElementById('timelineReg').textContent = userData.timeline.registration || '-';
    document.getElementById('timelinePay').textContent = userData.timeline.payment || '-';
    document.getElementById('timelineRole').textContent = userData.timeline.roleSelection || '-';
}

function printSummary() {
    window.print();
}

function exportAsPDF() {
    showLoading(true);
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add content to PDF
    doc.setFontSize(20);
    doc.text('Registration Summary', 20, 20);
    
    doc.setFontSize(12);
    let y = 40;
    
    // Personal Information
    doc.setFont(undefined, 'bold');
    doc.text('Personal Information:', 20, y);
    doc.setFont(undefined, 'normal');
    y += 10;
    doc.text(`Name: ${userData.personal.firstName} ${userData.personal.lastName}`, 20, y);
    y += 7;
    doc.text(`Email: ${userData.personal.email}`, 20, y);
    y += 7;
    doc.text(`Phone: ${userData.personal.phone}`, 20, y);
    y += 7;
    doc.text(`Address: ${userData.personal.address}`, 20, y);
    y += 7;
    doc.text(`Type of Product: ${userData.personal.typeOfProduct}`, 20, y);
    y += 7;
    doc.text(`Acceptable Document: ${userData.personal.acceptableDocument}`, 20, y);
    y += 10;
    
    // Requirements
    doc.setFont(undefined, 'bold');
    doc.text('Requirements:', 20, y);
    doc.setFont(undefined, 'normal');
    y += 10;
    doc.text(`Terms Accepted: ${userData.requirements.terms ? 'Yes' : 'No'}`, 20, y);
    y += 7;
    doc.text(`Money Available: ${userData.requirements.money ? 'Yes' : 'No'}`, 20, y);
    y += 7;
    doc.text(`Payment Method: ${userData.requirements.paymentMethod}`, 20, y);
    y += 10;
    
    // Payment
    doc.setFont(undefined, 'bold');
    doc.text('Payment Details:', 20, y);
    doc.setFont(undefined, 'normal');
    y += 10;
    doc.text(`Consultation Paid: ${userData.payment.consultation ? 'Yes' : 'No'}`, 20, y);
    y += 7;
    doc.text(`Payment Code: ${userData.payment.code}`, 20, y);
    y += 7;
    doc.text(`Payment Date: ${userData.payment.date}`, 20, y);
    y += 10;
    
    // Role
    doc.setFont(undefined, 'bold');
    doc.text('Selected Role:', 20, y);
    doc.setFont(undefined, 'normal');
    y += 10;
    doc.text(`Role: ${userData.role.selected}`, 20, y);
    y += 7;
    doc.text(`Price: ${userData.role.price}`, 20, y);
    y += 7;
    doc.text(`Selection Date: ${userData.role.date}`, 20, y);
    
    // Save the PDF
    doc.save('registration-summary.pdf');
    
    showLoading(false);
    showNotification('PDF exported successfully!', 'success');
}

function exportAsCSV() {
    showLoading(true);
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    csvContent += "Category,Field,Value\n";
    
    // Personal Information
    csvContent += `Personal Information,Name,${userData.personal.firstName} ${userData.personal.lastName}\n`;
    csvContent += `Personal Information,Email,${userData.personal.email}\n`;
    csvContent += `Personal Information,Phone,${userData.personal.phone}\n`;
    csvContent += `Personal Information,Address,${userData.personal.address}\n`;
    csvContent += `Personal Information,Type of Product,${userData.personal.typeOfProduct}\n`;
    csvContent += `Personal Information,Acceptable Document,${userData.personal.acceptableDocument}\n`;
    
    // Requirements
    csvContent += `Requirements,Terms Accepted,${userData.requirements.terms ? 'Yes' : 'No'}\n`;
    csvContent += `Requirements,Money Available,${userData.requirements.money ? 'Yes' : 'No'}\n`;
    csvContent += `Requirements,Payment Method,${userData.requirements.paymentMethod}\n`;
    csvContent += `Requirements,Video Watched,${userData.requirements.video ? 'Yes' : 'No'}\n`;
    
    // Payment
    csvContent += `Payment,Consultation Paid,${userData.payment.consultation ? 'Yes' : 'No'}\n`;
    csvContent += `Payment,Payment Code,${userData.payment.code}\n`;
    csvContent += `Payment,Payment Date,${userData.payment.date}\n`;
    
    // Role
    csvContent += `Role,Selected Role,${userData.role.selected}\n`;
    csvContent += `Role,Price,${userData.role.price}\n`;
    csvContent += `Role,Selection Date,${userData.role.date}\n`;
    
    // Timeline
    csvContent += `Timeline,Registration Date,${userData.timeline.registration}\n`;
    csvContent += `Timeline,Payment Date,${userData.timeline.payment}\n`;
    csvContent += `Timeline,Role Selection Date,${userData.timeline.roleSelection}\n`;
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "registration-summary.csv");
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    document.body.removeChild(link);
    
    showLoading(false);
    showNotification('CSV exported successfully!', 'success');
}

function completeProcess() {
    showLoading(true);
    
    // Simulate API call
    setTimeout(() => {
        showLoading(false);
        showSuccessModal();
        
        // Clear localStorage after completion
        localStorage.removeItem('userRegistrationData');
        
        // Reset form after delay
        setTimeout(() => {
            resetForm();
        }, 5000);
    }, 3000);
}

// Utility functions
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'flex';
        // add class for entrance animation
        modal.classList.add('show');
        // focus the OK button for accessibility
        const okBtn = modal.querySelector('button');
        if (okBtn) {
            okBtn.focus();
        }
    }
}

function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        // remove animation class then hide
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function saveToLocalStorage() {
    localStorage.setItem('userRegistrationData', JSON.stringify(userData));
}

function loadUserData() {
    const savedData = localStorage.getItem('userRegistrationData');
    if (savedData) {
        Object.assign(userData, JSON.parse(savedData));
    }
}

function updateUIFromData() {
    // Update step 1 form if data exists
    if (userData.personal.firstName) {
        document.getElementById('firstName').value = userData.personal.firstName;
        document.getElementById('lastName').value = userData.personal.lastName;
        document.getElementById('email').value = userData.personal.email;
        document.getElementById('phone').value = userData.personal.phone;
        document.getElementById('address').value = userData.personal.address;
        const prodEl = document.getElementById('typeOfProduct');
        const docEl = document.getElementById('acceptableDocument');
        if (prodEl) prodEl.value = userData.personal.typeOfProduct || '';
        if (docEl) docEl.value = userData.personal.acceptableDocument || '';
    }

    // Restore payment UI state if needed
    if (userData.payment.generatedCode) {
        const paymentCodeContainer = document.getElementById('paymentCodeContainer');
        const paymentCode = document.getElementById('paymentCode');
        const confirmationGroup = document.getElementById('confirmationGroup');
        if (paymentCode && paymentCodeContainer) {
            paymentCode.textContent = userData.payment.generatedCode;
            paymentCodeContainer.style.display = 'block';
        }
        if (confirmationGroup) confirmationGroup.style.display = 'block';
    }

    if (userData.payment.consultation) {
        const btn = document.getElementById('confirmPaymentBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Payment Confirmed';
            btn.disabled = true;
        }
    }
}

function resetForm() {
    // Clear all form fields
    document.querySelectorAll('input, textarea').forEach(field => {
        field.value = '';
        field.disabled = false;
    });
    
    // Reset checkboxes and radio buttons
    document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => {
        input.checked = false;
        input.disabled = false;
    });
    
    // Reset user data
    for (let key in userData) {
        if (typeof userData[key] === 'object') {
            for (let subKey in userData[key]) {
                if (key === 'timeline') {
                    if (subKey === 'registration') {
                        userData[key][subKey] = new Date().toLocaleString();
                    } else {
                        userData[key][subKey] = null;
                    }
                } else if (typeof userData[key][subKey] === 'boolean') {
                    userData[key][subKey] = false;
                } else {
                    userData[key][subKey] = null;
                }
            }
        }
    }
    
    // Reset UI
    currentStep = 1;
    currentTourCard = 1;
    paymentConfirmed = false;
    
    // Go to step 1
    goToStep(1);
    updateTourDisplay();
    
    // Reset buttons
    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.disabled = true;
    });
    
    // Reset requirements status
    for (let i = 1; i <= 4; i++) {
        const statusElement = document.getElementById(`status${i}`);
        if (statusElement) {
            statusElement.textContent = 'Pending';
            statusElement.className = 'req-status pending';
        }
        
        const cardElement = document.getElementById(`reqCard${i}`);
        if (cardElement) {
            cardElement.classList.remove('completed', 'failed');
        }
    }
    
    showNotification('Form has been reset', 'info');
}

// Add this to the existing initialize function
document.addEventListener('DOMContentLoaded', function() {
    initializeProgressBar();
    initializeVideoPreviews();
    loadUserData();
    updateTourCounter();
    
    // Set current date for registration
    userData.timeline.registration = new Date().toLocaleString();
    
    // Load saved data from localStorage
    const savedData = localStorage.getItem('userRegistrationData');
    if (savedData) {
        Object.assign(userData, JSON.parse(savedData));
        updateUIFromData();
    }
    
    // Initialize requirements if already on step 3
    if (currentStep === 3) {
        initializeRequirements();
    }

    // Render payment details in case user refreshes or lands on step 4
    renderPaymentDetails();

    // Observe step 4 activation to render details when it becomes active
    const step4 = document.getElementById('step4');
    if (step4) {
        const observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (step4.classList.contains('active')) {
                        renderPaymentDetails();
                    }
                }
            }
        });
        observer.observe(step4, { attributes: true });
    }
});
