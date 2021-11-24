class Modal {
    constructor() {
        this.wrapper = document.getElementById("wrapper");
        this.startDrag = this.startDrag.bind(this);
        this.dragObject = this.dragObject.bind(this);
        this.stopDrag = this.stopDrag.bind(this);
        this.clickClose = this.clickClose.bind(this);
        this.clickButton = this.clickButton.bind(this);
        this.onButtonClick = null;
        this.isCreated = false;
    }

    create(appName, hideOverlay, alignRight, title, content, buttonTexts = []) {
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
        this.update(appName, hideOverlay, alignRight, title, content, buttonTexts);

        // Add event listeners
        this.dragObj = null;
        this.xOffset = 0;
        this.yOffset = 0;
        this.modalTitleBar.addEventListener("mousedown", this.startDrag, true);
        this.modalTitleBar.addEventListener("touchstart", this.startDrag, true);
        this.wrapper.addEventListener("mouseup", this.stopDrag, true);
        this.wrapper.addEventListener("touchend", this.stopDrag, true);
        this.modalCloseIconWrapper.addEventListener("click", this.clickClose, true);
        for (const modalButton of this.modalButtons) {
            modalButton.addEventListener("click", this.clickButton, true);
        }
        // Append modal wrapper
        this.wrapper.appendChild(this.modalWrapper);
    }

    update(appName, hideOverlay, alignRight, title, content, buttonTexts = []) {
        if (!this.isCreated) {
            return;
        }
        this.modalWindow.className = `modal-window modal-${appName}`;
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
        this.wrapper.removeEventListener("mouseup", this.stopDrag, true);
        this.wrapper.removeEventListener("touchend", this.stopDrag, true);
        this.modalCloseIconWrapper.removeEventListener("click", this.clickClose, true);
        for (const modalButton of this.modalButtons) {
            modalButton.removeEventListener("click", this.clickButton, true);
        }
        // Remove modal wrapper
        this.wrapper.removeChild(this.modalWrapper);
        this.isCreated = false;
    }

    alert(appName, title, content, onButtonClick) {
        const createOrUpdate = this.isCreated ? this.update : this.create;
        createOrUpdate.call(this, appName, false, false, title, content, ["OK"]);
        this.onButtonClick = (buttonText) => {
            this.destroy();
            onButtonClick(buttonText);
        };
    }

    confirm(appName, title, content, onButtonClick) {
        const createOrUpdate = this.isCreated ? this.update : this.create;
        createOrUpdate.call(this, appName, false, false, title, content, ["Cancel", "OK"]);
        this.onButtonClick = (buttonText) => {
            this.destroy();
            onButtonClick(buttonText);
        };
    }

    tour(appName, title, content, buttonTexts = [], onButtonClick) {
        const createOrUpdate = this.isCreated ? this.update : this.create;
        createOrUpdate.call(this, appName, true, true, title, content, buttonTexts);
        this.onButtonClick = (buttonText) => {
            onButtonClick(buttonText);
        };
    }

    startDrag(event) {
        event.preventDefault();
        event.stopPropagation();
        if (!this.modalTitleBar.contains(event.target) || this.modalCloseIconWrapper.contains(event.target)) {
            return;
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
}