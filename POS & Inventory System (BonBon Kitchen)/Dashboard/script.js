document.addEventListener('DOMContentLoaded', () => {
    // 1. Inventory Navigation Feature
    const inventoryLinks = document.querySelectorAll('.inventory-link');
    const navItems = document.querySelectorAll('.main-navigation li');
    const inventoryNavItem = document.querySelector('li[data-section="inventory"]');

    inventoryLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetSection = link.getAttribute('data-link');

            if (targetSection === 'inventory') {
                // Remove 'active' class from all navigation items
                navItems.forEach(item => item.classList.remove('active'));

                // Add 'active' class to the Inventory item
                inventoryNavItem.classList.add('active');

                // In a real application, you would navigate the user here:
                // e.g., window.location.href = '/inventory';
                // or load the inventory component/page content.

                alert(`Navigating to the ${targetSection.toUpperCase()} section!`);
            }
        });
    });

    // 2. Sidebar Active State Switch
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove 'active' class from all
            navItems.forEach(i => i.classList.remove('active'));
            // Add 'active' class to the clicked item
            item.classList.add('active');

            // Optional: Log the change for verification
            const section = item.getAttribute('data-section');
            console.log(`Switched to: ${section}`);
        });
    });
});