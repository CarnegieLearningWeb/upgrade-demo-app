class Modal {
    constructor() {
        this.wrapper = document.getElementById("wrapper");
        this.startDrag = this.startDrag.bind(this);
        this.dragObject = this.dragObject.bind(this);
        this.stopDrag = this.stopDrag.bind(this);
        this.clickClose = this.clickClose.bind(this);
        this.clickButton = this.clickButton.bind(this);
        this.clampModalWindow = this.clampModalWindow.bind(this);
        this.onButtonClick = null;
        this.isCreated = false;
    }

    confirm(context, title, content, buttonTexts = [], onButtonClick) {
        const createOrUpdate = this.isCreated ? this.update : this.create;
        createOrUpdate.call(this, context, false, false, title, content, buttonTexts);
        this.onButtonClick = (buttonText) => {
            this.destroy();
            if (typeof onButtonClick === "function") {
                onButtonClick(buttonText);
            }
        }
        if (buttonTexts.length) {
            this.modalButtons[buttonTexts.length - 1].focus();
        }
    }

    tour(context, title, content, buttonTexts = [], onButtonClick) {
        const createOrUpdate = this.isCreated ? this.update : this.create;
        createOrUpdate.call(this, context, true, true, title, content, buttonTexts);
        this.onButtonClick = (buttonText) => {
            if (typeof onButtonClick === "function") {
                onButtonClick(buttonText);
            }
        }
        if (buttonTexts.length) {
            this.modalButtons[buttonTexts.length - 1].focus();
        }
    }

    create(context, hideOverlay, alignRight, title, content, buttonTexts = []) {
        if (this.isCreated) {
            return;
        }
        this.modalWrapper = document.createElement("div");
        this.modalWrapper.className = "modal-wrapper";
        this.modalWrapper.innerHTML =
            `
            <div class="modal-overlay"></div>
            <div class="modal-window">
                <div class="modal-title-bar">
                    <div class="modal-title-wrapper">
                        <p class="modal-title"></p>
                    </div>
                    <div class="modal-close-icon-wrapper">
                        <img class="modal-close-icon" src="/asset/image/modal-close-icon.png" alt="Modal Close Icon">
                    </div>
                </div>
                <div class="modal-contents">
                    <div class="modal-text-wrapper">
                        <p class="modal-text"></p>
                    </div>
                    <div class="modal-buttons-wrapper">
                        <button class="modal-button unselectable"></button>
                        <button class="modal-button unselectable"></button>
                        <button class="modal-button unselectable"></button>
                    </div>
                </div>
            </div>
            `;
        // Update elements
        this.modalOverlay = this.modalWrapper.querySelector(".modal-overlay");
        this.modalWindow = this.modalWrapper.querySelector(".modal-window");
        this.modalTitleBar = this.modalWrapper.querySelector(".modal-title-bar");
        this.modalTitle = this.modalWrapper.querySelector(".modal-title");
        this.modalText = this.modalWrapper.querySelector(".modal-text");
        this.modalCloseIconWrapper = this.modalWrapper.querySelector(".modal-close-icon-wrapper");
        this.modalButtons = this.modalWrapper.querySelectorAll(".modal-button");
        this.isCreated = true;
        this.update(context, hideOverlay, alignRight, title, content, buttonTexts);

        // Add event listeners
        this.dragObj = null;
        this.xOffset = 0;
        this.yOffset = 0;
        this.modalTitleBar.addEventListener("mousedown", this.startDrag, true);
        this.modalTitleBar.addEventListener("touchstart", this.startDrag, true);
        window.addEventListener("mouseup", this.stopDrag, true);
        window.addEventListener("touchend", this.stopDrag, true);
        this.modalCloseIconWrapper.addEventListener("click", this.clickClose, true);
        for (const modalButton of this.modalButtons) {
            modalButton.addEventListener("click", this.clickButton, true);
        }
        window.addEventListener("resize", this.clampModalWindow, true);

        // Append modal wrapper
        this.wrapper.appendChild(this.modalWrapper);
    }

    update(context, hideOverlay, alignRight, title, content, buttonTexts = []) {
        if (!this.isCreated) {
            return;
        }
        this.modalWindow.className = `modal-window modal-${context}`;
        this.modalOverlay.style.display = hideOverlay ? "none" : "block";
        this.modalWindow.style.right = alignRight ? "6px" : "auto";
        this.modalTitle.innerHTML = title;
        this.modalText.innerHTML = content;
        for (const modalButton of this.modalButtons) {
            modalButton.innerText = "";
            modalButton.style.display = "none";
        }
        for (let i = 0; i < buttonTexts.length; i++) {
            if (i === this.modalButtons.length) {
                break;
            }
            this.modalButtons[i].innerText = buttonTexts[i];
            this.modalButtons[i].style.display = "inline-block";
        }
    }

    destroy() {
        // Remove event listeners
        this.modalTitleBar.removeEventListener("mousedown", this.startDrag, true);
        this.modalTitleBar.removeEventListener("touchstart", this.startDrag, true);
        window.removeEventListener("mouseup", this.stopDrag, true);
        window.removeEventListener("touchend", this.stopDrag, true);
        this.modalCloseIconWrapper.removeEventListener("click", this.clickClose, true);
        for (const modalButton of this.modalButtons) {
            modalButton.removeEventListener("click", this.clickButton, true);
        }
        window.removeEventListener("resize", this.clampModalWindow, true);

        // Remove modal wrapper
        this.wrapper.removeChild(this.modalWrapper);
        this.isCreated = false;
    }

    startDrag(event) {
        event.preventDefault();
        event.stopPropagation();
        if (!this.modalTitleBar.contains(event.target) || this.modalCloseIconWrapper.contains(event.target)) {
            return;
        }
        if (this.modalOverlay.style.display === "none") {
            this.modalOverlay.style.opacity = 0;
            this.modalOverlay.style.display = "block";
            this.tempModalOverlay = true;
        }
        this.dragObj = this.modalWindow;
        const rect = this.dragObj.getBoundingClientRect();
        if (event.type == "mousedown") {
            this.xOffset = event.clientX - rect.left;
            this.yOffset = event.clientY - rect.top;
            window.addEventListener("mousemove", this.dragObject, true);
        }
        else if (event.type == "touchstart") {
            this.xOffset = event.targetTouches[0].clientX - rect.left;
            this.yOffset = event.targetTouches[0].clientY - rect.top;
            window.addEventListener("touchmove", this.dragObject, true);
        }
    }

    dragObject(event) {
        event.preventDefault();
        event.stopPropagation();
        if (this.dragObj == null) {
            return;
        }
        else if (event.type == "mousemove") {
            this.dragObj.style.left = `${event.clientX - this.xOffset}px`;
            this.dragObj.style.top = `${event.clientY - this.yOffset}px`;
        }
        else if (event.type == "touchmove") {
            this.dragObj.style.left = `${event.targetTouches[0].clientX - this.xOffset}px`;
            this.dragObj.style.top = `${event.targetTouches[0].clientY - this.yOffset}px`;
        }
    }

    stopDrag() {
        if (this.dragObj) {
            this.dragObj = null;
            window.removeEventListener("mousemove", this.dragObject, true);
            window.removeEventListener("touchmove", this.dragObject, true);
            if (this.tempModalOverlay) {
                this.modalOverlay.style.display = "none";
                this.modalOverlay.style.opacity = 1;
                this.tempModalOverlay = false;
            }
            this.clampModalWindow();
        }
    }

    clickClose() {
        if (typeof this.onButtonClick === "function") {
            this.onButtonClick("Close");
        }
    }

    clickButton(event) {
        if (typeof this.onButtonClick === "function") {
            this.onButtonClick(event.target.innerText);
        }
    }

    clampModalWindow() {
        const modalWindowLeft = parseInt(this.modalWindow.style.left);
        const modalWindowTop = parseInt(this.modalWindow.style.top);
        const modalWindowWidth = this.modalWindow.clientWidth;
        const modalWindowHeight = this.modalWindow.clientHeight;
        if (!isNaN(modalWindowLeft)) {
            if (modalWindowLeft + modalWindowWidth + 6 > window.innerWidth) {
                this.modalWindow.style.left = `${window.innerWidth - modalWindowWidth - 6}px`;
            }
            else if (modalWindowLeft < 6) {
                this.modalWindow.style.left = "6px";
            }
        }
        if (!isNaN(modalWindowTop)) {
            if (modalWindowTop + modalWindowHeight + 6 > window.innerHeight) {
                this.modalWindow.style.top = `${window.innerHeight - modalWindowHeight - 6}px`;
            }
            else if (modalWindowTop < 6) {
                this.modalWindow.style.top = "6px";
            }
        }
    }
}