/**
 * Simple keyword-based categorization for grocery items.
 * returns a category string based on the item name.
 */
export const getCategory = (itemName) => {
    const name = itemName.toLowerCase()

    // Define categories and their keywords
    const categories = {
        'Produce 🥬': ['apple', 'banana', 'lettuce', 'tomato', 'potato', 'onion', 'carrot', 'fruit', 'vegetable', 'berry', 'grape', 'citrus'],
        'Meat & Seafood 🥩': ['bacon', 'beef', 'chicken', 'pork', 'fish', 'salmon', 'steak', 'meat', 'sausage', 'turkey', 'lamb'],
        'Dairy & Eggs 🥛': ['milk', 'cheese', 'egg', 'yogurt', 'butter', 'cream', 'dairy'],
        'Bakery 🍞': ['bread', 'bagel', 'bun', 'cake', 'muffin', 'pastry', 'croissant', 'dough'],
        'Pantry 🥫': ['cereal', 'pasta', 'rice', 'bean', 'sauce', 'soup', 'can', 'oil', 'spice', 'flour', 'sugar'],
        'Frozen ❄️': ['frozen', 'ice cream', 'pizza'],
        'Beverages 🥤': ['water', 'soda', 'juice', 'coffee', 'tea', 'drink'],
        'Snacks 🍿': ['chip', 'cracker', 'cookie', 'candy', 'nut', 'snack', 'chocolate'],
        'Toiletries & Household 🧻': ['soap', 'clean', 'detergent', 'paper', 'towel', 'tissue', 'shampoo', 'paste', 'brush', 'bath'],
        'Pet Supplies 🐾': ['dog', 'cat', 'pet', 'food', 'litter']
    }

    // Check for matches
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => name.includes(keyword))) {
            return category
        }
    }

    return 'Other 🛒'
}
