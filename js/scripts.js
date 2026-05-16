// Global data storage
const userData = {
    personal: {},
    requirements: {
        terms: false,
        money: false,
        paymentMethod: null
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

// Section index within each top-level page (only one .step-content visible at a time)
const pageSectionIndex = { 1: 0, 2: 0, 3: 0 };

// 3-page flow:
// Page 1 => step 1 (registration + continuation + requirements on sub-pages)
// Page 2 => single view: 2.1 (tour) + 2.2 (table) + 2.3 video + 2.3.2 consultation (all in #step3)
// Page 3 => step 6 (services)
const groupedSteps = {
    1: [1],
    2: [3],
    3: [6]
};

function getPageSectionIndex(page) {
    return pageSectionIndex[page] ?? 0;
}

function normalizeStepNumber(stepNumber) {
    if (groupedSteps[stepNumber]) return stepNumber;
    if (stepNumber === 4 || stepNumber === 5) return 2;
    if (stepNumber >= 6) return 3;
    return 1;
}

function initStep1A1() {
    // Single checkbox -> show/hide all document previews
    const toggleAll = document.getElementById('doc_show_all');
    const docPreviews = [
        document.getElementById('docPreview_id'),
        document.getElementById('docPreview_passport'),
        document.getElementById('docPreview_permit')
    ].filter(Boolean);

    function setAllDocPreviews(visible) {
        docPreviews.forEach(el => {
            el.style.display = visible ? 'block' : 'none';
        });
    }

    if (toggleAll) {
        toggleAll.addEventListener('change', () => {
            setAllDocPreviews(toggleAll.checked);
        });
        // Initial state
        setAllDocPreviews(toggleAll.checked);
    }

    // A.1.3 (yego/oya) + follow-up
    const yego = document.getElementById('a13_yego');
    const oya = document.getElementById('a13_oya');
    const followup = document.getElementById('a13_followup');

    function setFollowupVisible(show) {
        if (!followup) return;
        followup.style.display = show ? 'block' : 'none';
        if (!show) {
            followup.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
        }
    }

    function updateA13() {
        if (yego && yego.checked) {
            if (oya) oya.checked = false;
            setFollowupVisible(false);
            return;
        }
        if (oya && oya.checked) {
            if (yego) yego.checked = false;
            setFollowupVisible(true);
            return;
        }
        setFollowupVisible(false);
    }

    if (yego) yego.addEventListener('change', updateA13);
    if (oya) oya.addEventListener('change', updateA13);

    updateA13();
}

// Video play functionality
function playVideo(element, videoUrl) {
    const container = element.closest('.video-container');
    const preview = container.querySelector('.video-preview');
    
    if (preview) {
        preview.style.display = 'none';
    }
    element.style.display = 'none';
    
    const existingVideo = container.querySelector('video:not(.video-preview)');
    if (existingVideo) {
        existingVideo.style.display = 'block';
        existingVideo.play();
        return;
    }
    
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
    
    const source = document.createElement('source');
    source.src = videoUrl;
    source.type = "video/mp4";
    video.appendChild(source);
    
    video.addEventListener('error', function(e) {
        console.error('Video error:', e);
        alert('Error loading video. Please check the video path: ' + videoUrl);
    });
    
    container.appendChild(video);
    
    video.play().catch(function(error) {
        console.error('Video play error:', error);
    });
}

// Initialize video previews at 2 seconds
function initializeVideoPreviews() {
    const videoPreviews = document.querySelectorAll('.video-preview');
    
    videoPreviews.forEach(video => {
        video.addEventListener('loadedmetadata', function() {
            if (this.duration >= 2) {
                this.currentTime = 2;
            } else if (this.duration > 0) {
                this.currentTime = this.duration / 2;
            }
        });
        
        video.addEventListener('seeked', function() {
            this.style.opacity = '1';
            this.style.display = 'block';
        });
        
        video.addEventListener('error', function(e) {
            console.error('Video preview error:', e, this.src);
            this.style.display = 'none';
        });
        
        video.load();
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeProgressBar();
    initializeVideoPreviews();
    loadUserData();
    updateTourCounter();

    userData.timeline.registration = new Date().toLocaleString();
    
    const savedData = localStorage.getItem('userRegistrationData');
    if (savedData) {
        Object.assign(userData, JSON.parse(savedData));
        updateUIFromData();
    }

    // ensure no role card shows the selection frame on initial load
    document.querySelectorAll('.role-card.selected').forEach(el => el.classList.remove('selected','pulse'));

    const regForm = document.getElementById('registrationForm');
    if (regForm) {
        regForm.addEventListener('submit', function(e) { e.preventDefault(); });
        regForm.addEventListener('keydown', function(e) { if (e.key === 'Enter') e.preventDefault(); });
    }

    renderPaymentDetails();

    const landingContinuation = document.getElementById('landingContinuation');
    const step2El = document.getElementById('step2');
    if (landingContinuation && step2El) {
        step2El.classList.remove('step-content');
        step2El.style.display = 'block';
        landingContinuation.appendChild(step2El);
    }

    mergeStep4IntoStep3();

    currentStep = 1;
    goToStep(1, 0);
});

// Progress bar functions
function initializeProgressBar() {
    const progressBar = document.querySelector('.progress-bar');
    const steps = document.querySelectorAll('.step');
    
    steps.forEach(step => {
        step.addEventListener('click', function() {
            const stepNumber = parseInt(this.getAttribute('data-step'), 10);
            goToStep(stepNumber, 0);
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
    const target = normalizeStepNumber(step);
    if (target === currentStep) {
        nextPageSection();
        return;
    }
    if (validateCurrentStep()) {
        goToStep(target, 0);
    }
}

function prevStep(step) {
    const target = normalizeStepNumber(step);
    if (target === currentStep) {
        prevPageSection();
        return;
    }
    goToStep(target, 0);
}

function validatePageSection(page, sectionIdx) {
    if (page === 1 && sectionIdx >= 1) {
        return validateRequirements();
    }
    return true;
}

function nextPageSection() {
    const pageSteps = groupedSteps[currentStep] || [];
    const idx = getPageSectionIndex(currentStep);

    if (idx < pageSteps.length - 1) {
        if (!validatePageSection(currentStep, idx)) return;
        goToStep(currentStep, idx + 1);
        return;
    }

    if (!validatePageSection(currentStep, idx)) return;
    const nextPage = currentStep + 1;
    if (groupedSteps[nextPage]) {
        goToStep(nextPage, 0);
    }
}

function prevPageSection() {
    const idx = getPageSectionIndex(currentStep);
    if (idx > 0) {
        goToStep(currentStep, idx - 1);
        return;
    }
    if (currentStep > 1) {
        const prevPage = currentStep - 1;
        const prevSections = groupedSteps[prevPage] || [];
        goToStep(prevPage, Math.max(0, prevSections.length - 1));
    }
}

function goToStep(stepNumber, sectionIndex) {
    const normalizedStep = normalizeStepNumber(stepNumber);
    const pageSteps = groupedSteps[normalizedStep] || [];
    if (!pageSteps.length) return;

    let sec = sectionIndex;
    if (sec === undefined || sec === null) {
        sec = getPageSectionIndex(normalizedStep);
    }
    sec = Math.max(0, Math.min(sec, pageSteps.length - 1));

    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.remove('active');
    });

    const stepElement = document.getElementById(`step${pageSteps[sec]}`);
    if (!stepElement) return;

    stepElement.classList.add('active');
    pageSectionIndex[normalizedStep] = sec;
    currentStep = normalizedStep;
    updateProgressBar();

    if (normalizedStep === 1) {
        initStep1A1();
        initializeRequirements();
    }

    if (normalizedStep === 2) {
        ensureStep2MarketContentVisible();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Step 2 is one scrollable page: 2.1, 2.2, video, consultation — keep all blocks visible. */
function ensureStep2MarketContentVisible() {
    ['step41Section', 'step43Section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
    const req4 = document.getElementById('reqCard4');
    if (req4) req4.classList.add('active');
}

/** Legacy onclick handlers: no longer hide sibling sections. */
function showStep41Table() {
    ensureStep2MarketContentVisible();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showStep42Video() {
    ensureStep2MarketContentVisible();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showStep43Consultation() {
    ensureStep2MarketContentVisible();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Move #step4 blocks into #step3 (2.1 footer) so progress step 2 is one DOM page. */
function mergeStep4IntoStep3() {
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    if (!step3 || !step4) return;

    const footers = step3.querySelectorAll(':scope > .button-group');
    const footer = footers.length ? footers[footers.length - 1] : null;
    if (!footer) return;

    const s41 = document.getElementById('step41Section');
    const s43 = document.getElementById('step43Section');
    [s41, s43].forEach(el => {
        if (!el) return;
        el.style.display = 'block';
        step3.insertBefore(el, footer);
    });

    step4.remove();
}

function validateCurrentStep() {
    const idx = getPageSectionIndex(currentStep);
    switch (currentStep) {
        case 1:
            if (idx >= 1) return validateRequirements();
            return validateRegistrationForm();
        case 2:
            return true;
        case 3:
            return true;
        default:
            return true;
    }
}

// Step 1: Registration Form (unchanged)
function validateRegistrationForm() {
    const form = document.getElementById('registrationForm');
    if (!form) return true;
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    let firstInvalid = null;

    requiredFields.forEach(field => {
        let valid = true;
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
    userData.personal = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        typeOfProduct: document.getElementById('typeOfProduct').value,
        acceptableDocument: document.getElementById('acceptableDocument').value
    };
    
    saveToLocalStorage();
    showNotification('Registration data saved successfully', 'success');
}

// Step 2: (Table – no JS needed)
// Step 3: Company Tour (unchanged)
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
    document.querySelectorAll('.tour-card').forEach(card => {
        card.classList.remove('active');
    });
    
    const currentCard = document.getElementById(`tourCard${currentTourCard}`);
    if (currentCard) {
        currentCard.classList.add('active');
    }
    
    updateTourCounter();
    
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
const totalRequirements = 3;

function initializeRequirements() {
    currentRequirement = 1;
    updateRequirementDisplay();
    updateRequirementsProgress();
}

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

function goToRequirementStep(reqNumber) {
    goToStep(1, 0);
    currentRequirement = reqNumber;
    updateRequirementDisplay();
}

function updateRequirementDisplay() {
    document.querySelectorAll('.requirement-card').forEach(card => {
        card.classList.remove('active');
        card.style.animation = 'slideInRight 0.5s ease';
    });
    
    const currentCard = document.getElementById(`reqCard${currentRequirement}`);
    if (currentCard) {
        currentCard.classList.add('active');
        
        if (currentRequirement > 1) {
            currentCard.style.animation = 'slideInRight 0.5s ease';
        } else {
            currentCard.style.animation = 'slideInLeft 0.5s ease';
        }
    }
    
    updateRequirementCounter();
    
    document.querySelectorAll('.req-dot').forEach((dot, index) => {
        const reqNumber = index + 1;
        dot.classList.remove('active', 'completed');
        
        if (reqNumber === 1 && userData.requirements.terms) {
            dot.classList.add('completed');
        } else if (reqNumber === 2 && userData.requirements.money) {
            dot.classList.add('completed');
        } else if (reqNumber === 3 && userData.requirements.paymentMethod) {
            dot.classList.add('completed');
        }
        
        if (reqNumber === currentRequirement) {
            dot.classList.add('active');
        }
    });
    
    const prevBtn = document.querySelector('.req-nav-btn:first-child');
    const nextBtn = document.querySelector('.req-nav-btn:last-child');
    
    if (prevBtn) {
        prevBtn.disabled = currentRequirement === 1;
        prevBtn.style.opacity = currentRequirement === 1 ? '0.5' : '1';
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentRequirement === totalRequirements;
        nextBtn.style.opacity = currentRequirement === totalRequirements ? '0.5' : '1';
        
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
            'Payment Methods'
        ];
        counter.textContent = `Requirement ${currentRequirement} of ${totalRequirements}: ${requirementNames[currentRequirement - 1]}`;
    }
}

function updateRequirementsProgress() {
    let completedCount = 0;
    
    if (userData.requirements.terms) completedCount++;
    if (userData.requirements.money) completedCount++;
    if (userData.requirements.paymentMethod) completedCount++;
    
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('requirementsProgress');
    
    if (progressText) {
        progressText.textContent = `${completedCount} of ${totalRequirements} requirements completed`;
        progressText.style.color = (completedCount === totalRequirements) ? 'var(--success-color)' : '';
        progressText.style.fontWeight = (completedCount === totalRequirements) ? '600' : '';
    }
    
    if (progressFill) {
        const percentage = (completedCount / totalRequirements) * 100;
        progressFill.style.width = `${percentage}%`;
    }
    
    const step4NextBtn = document.getElementById('step4Next'); // was step3Next
    if (step4NextBtn) {
        step4NextBtn.disabled = completedCount < totalRequirements;
    }
}

function confirmRequirement(reqNumber, confirmed) {
    const statusElement = document.getElementById(`status${reqNumber}`);
    const cardElement = document.getElementById(`reqCard${reqNumber}`);
    
    if (confirmed) {
        statusElement.textContent = 'Completed';
        statusElement.className = 'req-status completed';
        cardElement.classList.add('completed');
        cardElement.classList.remove('failed');
        
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
        }
        
        showNotification('Requirement confirmed successfully!', 'success');
        
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
        
        if (reqNumber === 1 || reqNumber === 2) {
            setTimeout(() => {
                showNotification('You must complete all requirements to proceed', 'warning');
            }, 1000);
        }
    }
    
    updateRequirementsProgress();
    
    const dot = document.querySelectorAll('.req-dot')[reqNumber - 1];
    if (dot && confirmed) {
        dot.classList.add('completed');
    } else if (dot) {
        dot.classList.remove('completed');
    }
    
    saveToLocalStorage();
    checkRequirementsCompletion();
}

function getSelectedPaymentMethod() {
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
    return selectedMethod ? selectedMethod.value : null;
}

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
    updateRequirementsProgress();
}

function checkRequirementsCompletion() {
    const allCompleted = 
        userData.requirements.terms &&
        userData.requirements.money &&
        userData.requirements.paymentMethod &&
        userData.payment.consultation;
    
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
    return true;
}

// Step 5: Consultation Payment (old step 4)
function togglePaymentDetails() {
    const directPayment = document.getElementById('directPayment');
    const paymentDetails = document.getElementById('paymentDetails');
    
    if (directPayment.checked) {
        paymentDetails.style.display = 'block';
        renderPaymentDetails();
    } else {
        paymentDetails.style.display = 'none';
        const nextBtn = document.getElementById('step4Next');
        if (nextBtn) {
            nextBtn.disabled = true;
        }
    }
}

function renderPaymentDetails() {
    const method = userData.requirements.paymentMethod || getSelectedPaymentMethod();
    const container = document.getElementById('selectedPaymentDetails');

    if (!container) return;

    if (!method) {
        container.innerHTML = `
            <div class="payment-code-info">
                <h4><i class="fas fa-exclamation-circle"></i> No payment method selected</h4>
                <p class="code-info-text">Please choose a payment method in Step 1 before proceeding. <button class="btn btn-secondary" onclick="goToStep(1, 0)">Choose Method</button></p>
            </div>`;
        document.getElementById('paidBtn').disabled = true;
        document.getElementById('changeMethodBtn').disabled = false;
        return;
    }

    document.getElementById('paidBtn').disabled = false;

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

function handlePaidClick() {
    const method = userData.requirements.paymentMethod || getSelectedPaymentMethod();
    if (!method) {
        showNotification('Please select a payment method first.', 'error');
        return;
    }

    const generated = generateRandomConfirmationCode();
    userData.payment.generatedCode = generated;
    const paymentCodeContainer = document.getElementById('paymentCodeContainer');
    const paymentCode = document.getElementById('paymentCode');
    const confirmBtn = document.getElementById('confirmPaymentBtn');

    if (paymentCode && paymentCodeContainer) {
        paymentCode.textContent = generated;
        paymentCodeContainer.style.display = 'block';
        paymentCode.classList.add('animate');
        paymentCodeContainer.classList.add('show');
    }

    try {
        navigator.clipboard.writeText(generated);
        showNotification('Confirmation code generated and copied to clipboard. Paste it into the confirmation field to verify.', 'info');
    } catch (e) {
        showNotification('Confirmation code generated. Copy it and paste into the confirmation field to verify.', 'info');
    }

    const confirmationGroup = document.getElementById('confirmationGroup');
    if (confirmationGroup) confirmationGroup.style.display = 'block';
    if (confirmBtn) confirmBtn.disabled = false;

    saveToLocalStorage();
}

function generateRandomConfirmationCode() {
    return 'PAY-' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

function copyPaymentCode() {
    const el = document.getElementById('paymentCode');
    if (!el) return;
    const code = (el.textContent || '').trim();
    if (!code || code.indexOf('XXXX') !== -1) {
        showNotification('No code generated yet. Click "I\'ve Paid" first.', 'error');
        return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function() {
            showNotification('Code copied! Paste it in the confirmation field below.', 'success');
        }).catch(function() {
            fallbackCopyCode(code);
        });
    } else {
        fallbackCopyCode(code);
    }
}

function fallbackCopyCode(code) {
    var input = document.createElement('input');
    input.value = code;
    input.setAttribute('readonly', '');
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, 9999);
    try {
        document.execCommand('copy');
        showNotification('Code copied! Paste it in the confirmation field below.', 'success');
    } catch (e) {
        showNotification('Copy failed. Please select the code and copy manually.', 'error');
    }
    document.body.removeChild(input);
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

    setTimeout(() => {
        userData.payment.consultation = true;
        userData.payment.code = entered;
        userData.payment.date = new Date().toLocaleString();
        userData.timeline.payment = userData.payment.date;

        const nextButton = document.getElementById('step43Next');
        if (nextButton) {
            nextButton.disabled = false;
        }

        const statusElement = document.getElementById('status4');
        const cardElement = document.getElementById('reqCard4');
        if (statusElement) {
            statusElement.textContent = 'Completed';
            statusElement.className = 'req-status completed';
        }
        if (cardElement) {
            cardElement.classList.add('completed');
            cardElement.classList.remove('failed');
        }

        const paymentCodeEl = document.getElementById('paymentCode');
        const paymentCodeContainer = document.getElementById('paymentCodeContainer');
        if (paymentCodeEl) paymentCodeEl.classList.remove('animate');
        if (paymentCodeContainer) paymentCodeContainer.classList.add('confirmed');

        saveToLocalStorage();
        showLoading(false);
        showNotification('Payment confirmed successfully!', 'success');

        const btn = document.getElementById('confirmPaymentBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Payment Confirmed';
            btn.disabled = true;
        }

        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) paidBtn.disabled = true;
        const changeBtn = document.getElementById('changeMethodBtn');
        if (changeBtn) changeBtn.disabled = true;

        const direct = document.getElementById('directPayment');
        if (direct) direct.disabled = true;

        delete userData.payment.generatedCode;
        saveToLocalStorage();
        updateRequirementsProgress();
        checkRequirementsCompletion();
    }, 1200);
}

function noPayment() {
    showNotification('Payment is required to proceed. Returning to previous step...', 'error');
    setTimeout(() => {
        goToStep(2);
    }, 2000);
}

function validatePayment() {
    if (!userData.payment.consultation) {
        showNotification('Please complete the payment process', 'error');
        return false;
    }
    return true;
}

const ROLE_CONFIG = {
    basic: {
        icon: 'fas fa-star',
        title: 'Basic Role',
        desc: 'For individuals getting started',
        color: 'rgb(4, 156, 62)',
        label: 'Basic',
        price: '-',
        cardId: 'basicRole'
    },
    standard: {
        icon: 'fas fa-gem',
        title: 'Standard Role',
        desc: 'For growing businesses',
        color: 'rgb(25, 88, 164)',
        label: 'Standard',
        price: '-',
        cardId: 'standardRole'
    },
    premium: {
        icon: 'fas fa-crown',
        title: 'Premium Role',
        desc: 'For enterprise solutions',
        color: 'rgb(238, 181, 11)',
        label: 'Premium',
        price: '-',
        cardId: 'premiumRole'
    },
    premiumExpress: {
        icon: 'fas fa-bolt',
        title: 'Premium Express Role',
        desc: 'For urgent 24-hour visibility',
        color: 'rgb(75, 238, 11)',
        label: 'Premium Express',
        price: '-',
        cardId: 'premiumExpressRole'
    }
};

function getRoleConfig(roleType) {
    return ROLE_CONFIG[roleType] || ROLE_CONFIG.basic;
}

// Step 6: User Roles (old step 5)
function selectRole(roleType) {
    const roleConfig = getRoleConfig(roleType);
    const roleCards = document.querySelectorAll('.role-card');
    roleCards.forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.getElementById(roleConfig.cardId);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        // ensure visible and give a short pulse highlight
        try {
            selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
            // fallback for older browsers
            selectedCard.scrollIntoView();
        }
        // no extra frames or pulses — single outline only
    }

    userData.role.selected = roleType;
    userData.role.price = roleConfig.price;
    userData.role.date = new Date().toLocaleString();
    userData.timeline.roleSelection = userData.role.date;
    saveToLocalStorage();
    
    const nextButton = document.getElementById('step6Next'); // was step5Next
    if (nextButton) {
        nextButton.disabled = false;
    }
    
    showNotification(`${roleConfig.label} role selected`, 'success');
}

// Step 7: Choose Role (old step 6)
function finalizeRoleSelection(roleType) {
    const roleConfig = getRoleConfig(roleType);
    const roleOptions = document.querySelectorAll('.role-option');
    roleOptions.forEach(option => {
        option.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`.role-option[onclick="finalizeRoleSelection('${roleType}')"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    const display = document.getElementById('selectedRoleDisplay');
    const icon = display.querySelector('.role-icon i');
    const title = display.querySelector('.role-info h3');
    const desc = display.querySelector('.role-info p');

    icon.className = roleConfig.icon;
    if (icon) {
        icon.style.color = roleConfig.color;
    }
    title.textContent = roleConfig.title;
    desc.textContent = roleConfig.desc;

    const selectedPriceEl = document.getElementById('selectedRolePrice');
    if (selectedPriceEl) selectedPriceEl.textContent = roleConfig.price;
    
    if (display) {
        display.classList.add('selected');
        display.style.borderColor = roleConfig.color;
    }
    
    const roleIconDiv = display.querySelector('.role-icon');
    if (roleIconDiv) {
        roleIconDiv.style.backgroundColor = roleConfig.color + '15';
        roleIconDiv.style.color = roleConfig.color;
    }
    
    userData.role.selected = roleType;
    userData.role.price = roleConfig.price;
    userData.role.date = new Date().toLocaleString();
    userData.timeline.roleSelection = userData.role.date;
    saveToLocalStorage();

    const nextBtn = document.getElementById('step7Next'); // was step6Next
    if (nextBtn) nextBtn.disabled = false;
}

function validateRoleSelection() {
    if (!userData.role.selected) {
        showNotification('Please select a role', 'error');
        return false;
    }
    return true;
}

// Step 8: Summary & Export (old step 7)
function updateSummary() {
    document.getElementById('summaryName').textContent = 
        `${userData.personal.firstName || '-'} ${userData.personal.lastName || '-'}`;
    document.getElementById('summaryEmail').textContent = userData.personal.email || '-';
    document.getElementById('summaryPhone').textContent = userData.personal.phone || '-';
    document.getElementById('summaryAddress').textContent = userData.personal.address || '-';
    document.getElementById('summaryTypeOfProduct').textContent = userData.personal.typeOfProduct || '-';
    document.getElementById('summaryAcceptableDocument').textContent = userData.personal.acceptableDocument || '-';
    
    document.getElementById('summaryTerms').textContent = userData.requirements.terms ? 'Yes' : 'No';
    document.getElementById('summaryTerms').style.color = userData.requirements.terms ? 'var(--success-color)' : 'var(--danger-color)';
    document.getElementById('summaryMoney').textContent = userData.requirements.money ? 'Yes' : 'No';
    document.getElementById('summaryMoney').style.color = userData.requirements.money ? 'var(--success-color)' : 'var(--danger-color)';
    document.getElementById('summaryPaymentMethod').textContent = userData.requirements.paymentMethod ? userData.requirements.paymentMethod.toUpperCase() : '-';
    document.getElementById('summaryVideo').textContent = userData.payment.consultation ? 'Yes' : 'No';
    document.getElementById('summaryVideo').style.color = userData.payment.consultation ? 'var(--success-color)' : 'var(--danger-color)';
    
    document.getElementById('summaryPayment').textContent = userData.payment.consultation ? 'Yes' : 'No';
    document.getElementById('summaryPayment').style.color = userData.payment.consultation ? 'var(--success-color)' : 'var(--danger-color)';
    document.getElementById('summaryPaymentCode').textContent = userData.payment.code || '-';
    document.getElementById('summaryPaymentDate').textContent = userData.payment.date || '-';
    
    document.getElementById('summaryRole').textContent = userData.role.selected ? getRoleConfig(userData.role.selected).label : '-';
    document.getElementById('summaryRolePrice').textContent = userData.role.price || '-';
    document.getElementById('summaryRoleDate').textContent = userData.role.date || '-';
    
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
    
    doc.setFontSize(20);
    doc.text('Registration Summary', 20, 20);
    
    doc.setFontSize(12);
    let y = 40;
    
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
    
    doc.setFont(undefined, 'bold');
    doc.text('Selected Role:', 20, y);
    doc.setFont(undefined, 'normal');
    y += 10;
    doc.text(`Role: ${userData.role.selected}`, 20, y);
    y += 7;
    doc.text(`Price: ${userData.role.price}`, 20, y);
    y += 7;
    doc.text(`Selection Date: ${userData.role.date}`, 20, y);
    
    doc.save('registration-summary.pdf');
    
    showLoading(false);
    showNotification('PDF exported successfully!', 'success');
}

function exportAsCSV() {
    showLoading(true);
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Category,Field,Value\n";
    
    csvContent += `Personal Information,Name,${userData.personal.firstName} ${userData.personal.lastName}\n`;
    csvContent += `Personal Information,Email,${userData.personal.email}\n`;
    csvContent += `Personal Information,Phone,${userData.personal.phone}\n`;
    csvContent += `Personal Information,Address,${userData.personal.address}\n`;
    csvContent += `Personal Information,Type of Product,${userData.personal.typeOfProduct}\n`;
    csvContent += `Personal Information,Acceptable Document,${userData.personal.acceptableDocument}\n`;
    
    csvContent += `Requirements,Terms Accepted,${userData.requirements.terms ? 'Yes' : 'No'}\n`;
    csvContent += `Requirements,Money Available,${userData.requirements.money ? 'Yes' : 'No'}\n`;
    csvContent += `Requirements,Payment Method,${userData.requirements.paymentMethod}\n`;
    csvContent += `Requirements,Consultation Paid,${userData.payment.consultation ? 'Yes' : 'No'}\n`;
    
    csvContent += `Payment,Consultation Paid,${userData.payment.consultation ? 'Yes' : 'No'}\n`;
    csvContent += `Payment,Payment Code,${userData.payment.code}\n`;
    csvContent += `Payment,Payment Date,${userData.payment.date}\n`;
    
    csvContent += `Role,Selected Role,${userData.role.selected}\n`;
    csvContent += `Role,Price,${userData.role.price}\n`;
    csvContent += `Role,Selection Date,${userData.role.date}\n`;
    
    csvContent += `Timeline,Registration Date,${userData.timeline.registration}\n`;
    csvContent += `Timeline,Payment Date,${userData.timeline.payment}\n`;
    csvContent += `Timeline,Role Selection Date,${userData.timeline.roleSelection}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "registration-summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showLoading(false);
    showNotification('CSV exported successfully!', 'success');
}

function completeProcess() {
    showLoading(true);
    
    setTimeout(() => {
        showLoading(false);
        showSuccessModal();
        localStorage.removeItem('userRegistrationData');
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
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
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
        modal.classList.add('show');
        const okBtn = modal.querySelector('button');
        if (okBtn) {
            okBtn.focus();
        }
    }
}

function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function closeModalAndReset() {
    closeModal();
    resetForm();
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
    document.querySelectorAll('input, textarea').forEach(field => {
        field.value = '';
        field.disabled = false;
    });
    
    document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => {
        input.checked = false;
        input.disabled = false;
    });
    
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
    
    currentStep = 1;
    pageSectionIndex[1] = 0;
    pageSectionIndex[2] = 0;
    pageSectionIndex[3] = 0;
    currentTourCard = 1;
    currentRequirement = 1;
    paymentConfirmed = false;
    
    goToStep(1, 0);
    updateTourDisplay();
    
    const step4NextBtn = document.getElementById('step4Next');
    if (step4NextBtn) step4NextBtn.disabled = true;
    const step43NextBtn = document.getElementById('step43Next');
    if (step43NextBtn) step43NextBtn.disabled = true;
    
    for (let i = 1; i <= totalRequirements; i++) {
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
