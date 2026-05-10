document.addEventListener('DOMContentLoaded', () => {
    const packList = document.getElementById('pack-list');
    const addPackBtn = document.getElementById('add-pack-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const copyBtn = document.getElementById('copy-btn');
    const jsonOutput = document.getElementById('json-output');

    let packs = [];

    function renderPacks() {
        packList.innerHTML = '';
        
        if (packs.length === 0) {
            packList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open fa-3x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No packs added yet. Click "Add Pack" to begin.</p>
                </div>
            `;
            return;
        }

        packs.forEach((pack, index) => {
            const packItem = document.createElement('div');
            packItem.className = 'pack-item';
            packItem.setAttribute('draggable', 'true');
            packItem.setAttribute('data-index', index);
            
            packItem.innerHTML = `
                <div class="pack-order-controls">
                    <button class="btn-icon up-btn" title="Move Up" ${index === 0 ? 'disabled' : ''}><i class="fas fa-chevron-up"></i></button>
                    <button class="btn-icon down-btn" title="Move Down" ${index === packs.length - 1 ? 'disabled' : ''}><i class="fas fa-chevron-down"></i></button>
                </div>
                <div class="pack-inputs">
                    <div class="input-group uuid-group">
                        <label>Pack UUID</label>
                        <input type="text" class="uuid-input" placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000" value="${pack.uuid}">
                    </div>
                    <div class="input-group version-group">
                        <label>Version</label>
                        <input type="text" class="version-input" placeholder="e.g. 1.0.0" value="${pack.version}">
                    </div>
                </div>
                <button class="btn-icon danger-icon" title="Remove Pack" style="border-color: rgba(239, 68, 68, 0.3); color: #ef4444;"><i class="fas fa-times"></i></button>
            `;

            // Add event listeners
            packItem.querySelector('.up-btn').addEventListener('click', () => movePack(index, -1));
            packItem.querySelector('.down-btn').addEventListener('click', () => movePack(index, 1));
            packItem.querySelector('.danger-icon').addEventListener('click', () => removePack(index));
            
            const uuidInput = packItem.querySelector('.uuid-input');
            const versionInput = packItem.querySelector('.version-input');
            
            uuidInput.addEventListener('input', (e) => {
                packs[index].uuid = e.target.value;
            });
            versionInput.addEventListener('input', (e) => {
                packs[index].version = e.target.value;
            });

            // Drag events
            packItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
                setTimeout(() => packItem.classList.add('dragging'), 0);
            });
            packItem.addEventListener('dragend', () => {
                packItem.classList.remove('dragging');
            });

            packList.appendChild(packItem);
        });
    }

    function addPack() {
        packs.push({ uuid: '', version: '1.0.0' });
        renderPacks();
        
        // Scroll to bottom
        setTimeout(() => {
            packList.scrollTop = packList.scrollHeight;
        }, 50);
    }

    function removePack(index) {
        packs.splice(index, 1);
        renderPacks();
    }

    function movePack(index, direction) {
        if (index + direction < 0 || index + direction >= packs.length) return;
        
        const temp = packs[index];
        packs[index] = packs[index + direction];
        packs[index + direction] = temp;
        
        renderPacks();
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.pack-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function generateJSON() {
        const result = packs.map(pack => {
            // Parse version string (e.g., "1.0.0" -> [1, 0, 0])
            let versionArr = [1, 0, 0];
            if (pack.version) {
                const parts = pack.version.split('.').map(v => parseInt(v, 10));
                if (parts.length > 0 && !isNaN(parts[0])) {
                    versionArr = parts;
                    // Pad with 0s if less than 3
                    while(versionArr.length < 3) versionArr.push(0);
                }
            }

            return {
                "pack_id": pack.uuid || generateUUID(),
                "version": versionArr
            };
        });

        const jsonStr = JSON.stringify(result, null, 4);
        jsonOutput.value = jsonStr;
        
        if (result.length > 0) {
            downloadBtn.disabled = false;
            copyBtn.disabled = false;
        } else {
            downloadBtn.disabled = true;
            copyBtn.disabled = true;
        }
    }

    function downloadJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonOutput.value);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", "world_packs.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    function copyJSON() {
        if (!jsonOutput.value) return;
        navigator.clipboard.writeText(jsonOutput.value).then(() => {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }

    // Event Listeners
    addPackBtn.addEventListener('click', addPack);
    clearAllBtn.addEventListener('click', () => {
        if(confirm('Are you sure you want to clear all packs?')) {
            packs = [];
            renderPacks();
            jsonOutput.value = '';
            downloadBtn.disabled = true;
            copyBtn.disabled = true;
        }
    });

    packList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(packList, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (dragging) {
            if (afterElement == null) {
                packList.appendChild(dragging);
            } else {
                packList.insertBefore(dragging, afterElement);
            }
        }
    });

    packList.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
        
        const items = [...packList.querySelectorAll('.pack-item')];
        const dragging = document.querySelector('.dragging');
        const newIndex = items.indexOf(dragging);
        
        if (draggedIndex !== newIndex && !isNaN(draggedIndex) && !isNaN(newIndex)) {
            const itemToMove = packs[draggedIndex];
            packs.splice(draggedIndex, 1);
            packs.splice(newIndex, 0, itemToMove);
            renderPacks();
        }
    });

    generateBtn.addEventListener('click', generateJSON);
    downloadBtn.addEventListener('click', downloadJSON);
    copyBtn.addEventListener('click', copyJSON);

    // Initial render
    renderPacks();
});
