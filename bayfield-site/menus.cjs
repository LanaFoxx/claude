// Restaurant menus, transcribed from the client's 2025 PDFs. Each section: [title, note, items],
// item: [name, price, description]. Prices without "$" as printed on the menus.

const DINING = [
  ['Starters', '', [
    ['Shrimp Cocktail', '16', 'Jumbo shrimp, spicy house cocktail sauce'],
    ['Mexican Shrimp Salsa', '16', 'Shrimp, spicy tomato juice, pico de gallo, cucumber, avocado, lime, corn chips'],
    ['Smoked Trout Dip', '16', 'Brown sugar smoked trout, cream cheese, herbs and spices, naan dippers'],
    ['Chicken Strip Basket', '16', 'Five breaded and fried chicken strips, crispy seasoned fries'],
    ['Cheese Curds', '16', 'Battered and fried white cheddar curds, house sauce'],
    ['Roasted Garlic & Red Pepper Hummus', '15', 'House-made hummus, fresh veggies, naan'],
  ]],
  ['Salads & Bowls', 'Add fire-braised chicken 4 · grilled shrimp 7 · blackened whitefish 5', [
    ['Bayfield Inn House Salad', '13', 'Bed of greens, macerated craisins, spiced pecans, award-winning maple vinaigrette'],
    ['The Caesar', '13', 'Parmesan, tomatoes, bed of greens, creamy Caesar dressing, croutons'],
    ['The Cobb', '19', 'Greens, tomatoes, egg, bacon, blue cheese. Choice of fire-braised chicken, blackened whitefish or panko-breaded whitefish. Dressings: blue cheese, ranch, French, Italian, Asian vinaigrette, maple vinaigrette'],
    ['Spicy Veggie Rice Bowl', '16', 'Sautéed fresh veggie blend, coconut rice, spicy coconut curry sauce, scallions, sesame seeds'],
  ]],
  ['Fresh Lake Superior Fish', 'Locally sourced: Halvorsen Fisheries, Cornucopia, and Bodin’s in Bayfield. Served with house rice and fresh sautéed vegetables. Broiled, spicy blackened, cedar-planked or deep fried.', [
    ['Lake Superior Whitefish', '21', ''],
    ['Lake Trout', '23', 'Fresh trout only when available'],
  ]],
  ['Entrées', 'Served with sautéed fresh vegetable du jour and a choice of garlic mashed baby potatoes, seasoned fried potato medley or house coconut rice', [
    ['Sea Scallops', '35', 'Pan-seared, lemon oil, garlic'],
    ['Jumbo Shell-On Prawns', '35', 'Broiled or grilled'],
    ['Char-Grilled Ribeye Steak', '45', 'Maître d’ butter, fresh vegetables'],
    ['8 oz. Center-Cut Filet', '48', 'Red wine demi-glace, garlic mashed potatoes'],
    ['Land & Sea Combo', '44', '4 oz. char-grilled petite beef filet, red wine demi-glace, lemon oil, with scallops or prawns'],
    ['Seafood Platter', '44', 'Sea scallops, garlic butter prawns, breaded butterflied shrimp, shrimp cocktail, fried Lake Superior whitefish, breaded calamari, French fries, tartar, cocktail sauce, fresh lemon'],
    ['Chicken Scallopini', '25', 'Fresh chicken breasts, garlic white wine lemon caper sauce, over a bed of rice'],
  ]],
  ['Burgers, Sandwiches & Pasta', '', [
    ['Applefest Burger', '19', 'Steak burger, Bayfield apple butter, bacon, cheddar, bourbon BBQ sauce, pretzel bun, crispy seasoned fries. Gluten-free bun 2 · extra apple butter 1'],
    ['Thai Chicken Sandwich', '18', 'Char-grilled chicken breast, Thai peanut sauce, arugula, pickled red onion, crispy seasoned fries'],
    ['Penne Alfredo or Garlic & EVOO', '18', 'House-made Alfredo or garlic and olive oil, vegetable du jour, scallions. Add fire-braised chicken 4 · whitefish 4 · shrimp 7'],
  ]],
  ['To Start', '', [
    ['Warm Breadbasket', '3', ''],
    ['House Salad', '5', ''],
    ['Caesar Salad', '5', ''],
    ['Cup of Homemade Soup', '5', ''],
  ]],
];

const LOUNGE = [
  ['Shareables', '', [
    ['Beer Battered Curds', '13', '“The square ones.” Battered and fried white cheddar curds, house sauce'],
    ['Drunken Mussels', '16', 'Bourbon, maple syrup, andouille sausage, cream, thyme, toasted baguette. Try it with our Old Fashioned Up North'],
    ['Flamingo Tenders', '14', '“Just like the ones you remember.” Hand-breaded chicken tenders, cayenne buffalo sauce, green onion, house blue cheese'],
    ['Black ’n Blue Steak Bites', '17', 'Cajun tenderloin, tomato, spinach, blue cheese, balsamic'],
    ['Seafood Platter', '42', 'Seared scallops, garlic butter prawns, crispy shrimp, fried fish, breaded calamari strips, shrimp cocktail, fries, sauces and lemon'],
    ['Seared Sea Scallops', '15', 'Lemon, garlic, butter'],
    ['Margherita Flatbread', '16', 'Italian plum tomato sauce, fresh basil, mozzarella, gluten-free cauliflower crust. Add fire-braised chicken'],
  ]],
  ['Bowls', 'Add fire-braised chicken 4 · blackened whitefish 4 · grilled shrimp 7', [
    ['Housemade Clam Chowder', '5 / 7', 'Cup or bowl'],
    ['Bayfield Inn House Salad', '13', 'Greens, dried cranberries, spiced roasted pecans, award-winning maple vinaigrette'],
    ['The Cobb Salad', '17', 'Greens, hard-boiled egg, tomato, bacon, blue cheese, choice of dressing. With fire-braised chicken or blackened or panko-breaded whitefish'],
    ['The Caesar', '13', 'Greens, tomato, Parmesan, croutons, Caesar dressing'],
    ['Spaghetti and Meatballs', '15', 'Rich marinara, homemade meatballs, Italian cheese blend'],
    ['Spicy Vegan Rice Bowl', '15', 'Sautéed fresh veggies, coconut rice, spicy coconut sauce, scallions, sesame seeds'],
  ]],
  ['Plates', 'Gluten-free bun for any bun or bread 3', [
    ['Applefest Burger', '18', 'Erickson’s apple butter, cheddar, bourbon BBQ bacon, pretzel bun, beer-battered fries'],
    ['Open Faced Meatloaf Sandwich', '15', 'Grilled homemade meatloaf, brioche, mashed potatoes and gravy'],
    ['Steak + Frites', '45', '12 oz. char-grilled ribeye, maître d’ butter, crinkle-cut fries'],
    ['Fish + Chips', '17', 'Panko-breaded whitefish, house slaw, crinkle-cut fries, tartar and lemon'],
    ['Whitefish Tacos', '15', 'Fresh Lake Superior whitefish, spicy blackened or panko-breaded, house slaw, tomato, Oaxaca cheese, chips and salsa'],
    ['Smash Burger', '15', 'Two beef patties, American cheese, fried onion, pickle, mayo, toasted bun, fries'],
    ['Spicy Chicken Popper Sandwich', '16', 'Deep-fried chicken breast, bacon, jalapeño cream cheese, pepper jack, toasted bun, beer-battered fries'],
  ]],
];

const DECK_FOOD = [
  ['Shareables', '', [
    ['Beer Battered Curds', '16', 'White cheddar curds, the Inn’s house sauce'],
    ['Smoked Trout Dip', '16', 'Brown sugar smoked trout, cream cheese, herbs and spices, fresh veggies, naan dippers'],
    ['Chicken Strip Basket', '16', 'Five breaded and fried chicken breast strips, crispy seasoned fries'],
    ['Deck Nachos', '16', 'Green chile queso blanco, pico de gallo, lettuce, black olives, Oaxaca, sour cream, salsa, blue corn tortilla chips. Add birria chicken 4 · birria beef 4'],
    ['Roasted Garlic & Red Pepper Hummus', '15', 'House-made hummus, fresh veggies, naan dippers'],
    ['Classic Shrimp Cocktail', '16', 'Jumbo shrimp, spicy house cocktail sauce, fresh lemon'],
    ['Mexican Shrimp Salsa', '16', 'Shrimp, spicy tomato juice, pico de gallo, cucumber, avocado, lime, corn chips'],
  ]],
  ['In Between', 'Sandwiches are served with crispy seasoned fries. Gluten-free bun 2', [
    ['Whitefish Sandwich', '16', 'Fresh Lake Superior whitefish, spicy blackened or panko-breaded, lettuce, tomato, tartar, fresh lemon'],
    ['Applefest Burger', '19', 'Steak burger, Bayfield apple butter, bacon, cheddar, bourbon BBQ sauce, pretzel bun. Extra apple butter 1'],
    ['Superior Fish Tacos', '18', 'Fresh Lake Superior whitefish, spicy blackened or panko-breaded, pico de gallo, Oaxaca, house slaw, blue corn tortilla chips, salsa, sour cream'],
    ['Deluxe Burger or Wild Rice Patty', '18', 'Steak burger or wild rice patty, lettuce, tomato. Swiss, American, cheddar or pepper jack'],
    ['Avocado Toast', '16', 'Sourdough, arugula, tomato, guacamole, spicy nuts, balsamic glaze. Add bacon 2'],
    ['Upper Deck Club', '19', 'Sliced turkey, lettuce, tomato, bacon, cheddar, Swiss, mayo, guacamole, ciabatta'],
    ['Thai Chicken Sandwich', '18', 'Char-grilled chicken breast, arugula, Thai peanut sauce, pickled red onion'],
    ['Pork Belly Cubano', '19', 'Crispy pork belly, ham, Swiss, pickles, Dijon aioli, ciabatta'],
  ]],
  ['Land & Sea', '', [
    ['Cedar Planked Whitefish', '22', 'Fresh Lake Superior whitefish, arugula salad, lemon oil, Parmesan'],
    ['Fish & Chips', '18', 'Panko-breaded fresh Lake Superior whitefish, house slaw, fresh lemon, house-made tartar, crispy seasoned fries'],
    ['Spicy Veggie Rice Bowl', '16', 'Sautéed fresh veggie blend, coconut rice, spicy coconut sauce, pico de gallo, sesame seeds. Add fire-braised chicken 4 · grilled shrimp 7'],
    ['Seafood Platter', '44', 'Seared scallops, garlic butter prawns, breaded calamari, fried shrimp, shrimp cocktail, fried whitefish, fries, tartar, cocktail sauce, lemon'],
    ['Surf and Turf', '40', 'Char-grilled petite filet, deep-fried shrimp, crispy seasoned fries'],
    ['Steak & Frites', '38', '12 oz. hand-cut char-grilled ribeye, maître d’ butter, crispy seasoned fries'],
    ['Chicken Scallopini', '25', 'Fresh chicken breasts, garlic white wine lemon caper sauce, over a bed of rice'],
    ['Brisket Mac ’n Cheese', '19', 'Macaroni and cheese, smoked beef brisket, bell peppers, onions, bacon habanero jam, Oaxaca'],
    ['Pasta Options', '18', 'Penne, scallions, with Alfredo, garlic and olive oil, or butter. Add fire-braised chicken 4 · grilled shrimp 7 · blackened whitefish 4'],
  ]],
  ['Fresh & Green', 'Add fire-braised chicken 4 · grilled shrimp 7 · blackened whitefish 4', [
    ['The Caesar', '13', 'Bed of greens, Parmesan, tomatoes, croutons, creamy Caesar'],
    ['The Cobb', '19', 'Bed of greens, tomato, bacon, egg, blue cheese, with blackened whitefish, grilled shrimp or fire-braised chicken. French, ranch, maple vinaigrette, creamy Italian, blue cheese or Asian vinaigrette'],
    ['The Bayfield Inn House Salad', '13', 'Bed of greens, spiced pecans, cranberries, maple vinaigrette'],
    ['The Inn’s House Side Salad', '6', ''],
    ['The Caesar Side Salad', '6', ''],
  ]],
];

const DECK_DRINKS = [
  ['Deck Cocktails', '10 each', [
    ['Deckside Berry Smash', '', 'Basil Hayden bourbon, fresh seasonal berries, fresh mint, simple syrup, soda'],
    ['Lakehouse Mule', '', 'Copper Crow vodka, jalapeño-lime juice, ginger beer'],
    ['Rooftop Lemonade', '', 'Effen cucumber vodka, fresh lemonade, soda water'],
    ['Painkiller', '', 'Pusser’s rum, pineapple juice, orange juice, cream of coconut, nutmeg'],
    ['Spicy Paloma', '', 'Hornitos, jalapeño-lime juice, grapefruit, salt rim'],
    ['16 oz. Frozen Cocktail du Jour', '12', 'Ask your bartender about today’s feature'],
  ]],
  ['Draft Selections', '8 each', [
    ['Galactic Face Slap Hazy IPA', '', 'Duluth, MN. Tropical fruit, juicy citrus, pillowy smooth mouthfeel'],
    ['Earth Rider Blueberry Honey Cream', '', 'Superior, WI. Light, gentle sweetness, soft malt, smooth finish'],
    ['Beerfield Inn Light Lager', '', 'Brewed for us by Bent Paddle. It goes down smoother than a calm Lake Superior sunset'],
    ['Yuengling', '', 'Pottsville, PA. Classic American amber, caramel-malt backbone'],
    ['New Glarus Spotted Cow', '', 'New Glarus, WI. Naturally cloudy farmhouse ale'],
  ]],
  ['Bayfield Hard Ciders', '8 each', [
    ['Apfelhaus Dry Cider', '', 'Bayfield, WI'],
    ['Apfelhaus Cherry Cider', '', 'Bayfield, WI'],
    ['Apfelhaus Hard Hopped Cider', '', 'Bayfield, WI'],
  ]],
  ['Wines', '11 each', [
    ['Chardonnay', '', 'Maddalena'],
    ['Pinot Grigio', '', 'Kris'],
    ['Riesling', '', 'Selbach Incline'],
    ['Red Blend', '', 'Ghostrunner'],
  ]],
  ['Seltzers', '7 each', [
    ['Long Drink Traditional', '', ''], ['Long Drink Zero Sugar', '', ''], ['Surfside Raspberry Tea', '', ''],
    ['Carbliss', '', 'Plymouth, WI. Variety of flavors'], ['Surfside Strawberry Lemonade', '', ''], ['Surfside Lemonade', '', ''],
  ]],
  ['Craft, Import & Regional Cans', '', [
    ['Blue Moon Belgian White', '', 'Denver, CO'], ['Castle Danger', '', 'Two Harbors, MN'], ['Corona', '', 'Mexico'], ['Modelo', '', ''],
    ['Guinness Draught Stout', '', ''], ['South Shore Nut Brown Ale', '', 'Washburn, WI'], ['Bent Paddle Golden Hop IPA', '', 'Duluth, MN'], ['Twisted Tea', '', 'Cincinnati, OH'],
  ]],
  ['Domestics', '6 each', [
    ['Budweiser · Bud Light · Coors Light · Michelob Golden Light · Michelob Ultra · Miller High Life · Miller Lite · Pabst Blue Ribbon · Hamm’s (tall boy)', '', ''],
  ]],
  ['N/A Beverages', '', [
    ['Busch N/A · Elysian Easy Dust IPA N/A · Michelob Ultra 0.0 · Goslings Ginger Beer · Fresh Brewed Iced Tea · Coke Products', '', ''],
  ]],
  ['Alternative Beverages', '', [
    ['Mae Mae Mule (10 mg THC)', '9', 'Nowadays infusion, pineapple juice, ginger beer, lime'],
    ['Lavender Lemon Highball (5 mg THC)', '', 'Nowadays lemon infusion, fresh lemon, lavender club soda'],
    ['Garden Mary', '', 'Seedlip Garden N/A, Redneck Juice, celery salt'],
    ['Maple Ginger Cooler', '', 'Maple ginger shrub, Seedlip Spice N/A, ginger beer, lime'],
    ['Tart Cherry Spritzer', '', 'Tart cherry shrub, Sprite, club soda'],
    ['Ember Blackberry Lemonade (10 mg THC)', '', 'Duluth, MN'],
    ['Looner’s Root Beer or Grape Soda (10 mg THC)', '', ''],
  ]],
];

const SERVICE_NOTE = 'A 5% service charge is added to your final bill. This is not a gratuity: 100% goes to our back-of-house staff.';
const RAW_NOTE = 'Consuming raw or undercooked meat or eggs may increase the likelihood of foodborne illness.';

module.exports = {
  'lakeside-dining-room': { menus: [{ title: 'Dinner', sections: DINING, pdf: 'bayfield-menu-lakeside-dining-room.pdf' }], notes: [SERVICE_NOTE, RAW_NOTE],
    footer: 'We incorporate fresh, local ingredients as much as possible: fish, cheese, sauces, fruits and vegetables grown and produced on the Bayfield Peninsula.' },
  'the-lounge': { menus: [{ title: 'Lounge menu', sections: LOUNGE, pdf: 'bayfield-menu-the-lounge.pdf' }], notes: [RAW_NOTE],
    footer: 'Come and join us: Chicken Wednesdays and Tex-Mex Thursdays.' },
  'the-deck': { menus: [{ title: 'Food', sections: DECK_FOOD, pdf: 'bayfield-menu-the-deck.pdf' }, { title: 'Drinks', sections: DECK_DRINKS, pdf: 'bayfield-menu-the-deck-drinks.pdf' }], notes: [SERVICE_NOTE, RAW_NOTE] },
};
