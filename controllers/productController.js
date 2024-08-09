const Product = require("../models/productSchema");
const Customer = require("../models/customerSchema");
const Order = require("../models/orderSchema");

const productCreate = async (req, res) => {
    try {
        const product = new Product(req.body)

        let result = await product.save();

        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

const getProducts = async (req, res) => {
    try {
        let products = await Product.find().populate("seller", "shopName");
        if (products.length > 0) {
            res.send(products);
        } else {
            res.send({ message: "No products found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getSellerProducts = async (req, res) => {
    try {
        let products = await Product.find({ seller: req.params.id })
        if (products.length > 0) {
            res.send(products)
        } else {
            res.send({ message: "No products found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getProductDetail = async (req, res) => {
    try {
        let product = await Product.findById(req.params.id)
            .populate("seller", "shopName")
            .populate({
                path: "reviews.reviewer",
                model: "customer",
                select: "name"
            });

        if (product) {
            res.send(product);
        }
        else {
            res.send({ message: "No product found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

const updateProduct = async (req, res) => {
    try {
        let result = await Product.findByIdAndUpdate(req.params.id,
            { $set: req.body },
            { new: true })

        res.send(result)
    } catch (error) {
        res.status(500).json(error);
    }
}

const addReview = async (req, res) => {
    try {
        const { rating, comment, reviewer } = req.body;
        const productId = req.params.id;

        const product = await Product.findById(productId);

        const existingReview = product.reviews.find(review => review.reviewer.toString() === reviewer);

        if (existingReview) {
            return res.send({ message: "You have already submitted a review for this product." });
        }

        product.reviews.push({
            rating,
            comment,
            reviewer,
            date: new Date(),
        });

        const updatedProduct = await product.save();

        res.send(updatedProduct);
    } catch (error) {
        res.status(500).json(error);
    }
};

const searchProduct = async (req, res) => {
    try {
        const key = req.params.key;

        let products = await Product.find({
            $or: [
                { productName: { $regex: key, $options: 'i' } },
                { category: { $regex: key, $options: 'i' } },
                { subcategory: { $regex: key, $options: 'i' } }
            ]
        }).populate("seller", "shopName");

        if (products.length > 0) {
            res.send(products);
        } else {
            res.send({ message: "No products found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const searchProductbyCategory = async (req, res) => {
    try {
        const key = req.params.key;

        let products = await Product.find({
            $or: [
                { category: { $regex: key, $options: 'i' } },
            ]
        }).populate("seller", "shopName");

        if (products.length > 0) {
            res.send(products);
        } else {
            res.send({ message: "No products found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const searchProductbySubCategory = async (req, res) => {
    try {
        const key = req.params.key;

        let products = await Product.find({
            $or: [
                { subcategory: { $regex: key, $options: 'i' } }
            ]
        }).populate("seller", "shopName");

        if (products.length > 0) {
            res.send(products);
        } else {
            res.send({ message: "No products found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);

        await Customer.updateMany(
            { "cartDetails._id": deletedProduct._id },
            { $pull: { cartDetails: { _id: deletedProduct._id } } }
        );

        res.send(deletedProduct);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteProducts = async (req, res) => {
    try {
        const deletionResult = await Product.deleteMany({ seller: req.params.id });

        const deletedCount = deletionResult.deletedCount || 0;

        if (deletedCount === 0) {
            res.send({ message: "No products found to delete" });
            return;
        }

        const deletedProducts = await Product.find({ seller: req.params.id });

        await Customer.updateMany(
            { "cartDetails._id": { $in: deletedProducts.map(product => product._id) } },
            { $pull: { cartDetails: { _id: { $in: deletedProducts.map(product => product._id) } } } }
        );

        res.send(deletionResult);
    } catch (error) {
        res.status(500).json(error);
    }
};


const deleteProductReview = async (req, res) => {
    try {
        const { reviewId } = req.body;
        const productId = req.params.id;

        const product = await Product.findById(productId);

        const updatedReviews = product.reviews.filter(review => review._id != reviewId);

        product.reviews = updatedReviews;

        const updatedProduct = await product.save();

        res.send(updatedProduct);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteAllProductReviews = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        product.reviews = [];

        const updatedProduct = await product.save();

        res.send(updatedProduct);
    } catch (error) {
        res.status(500).json(error);
    }
};

const getInterestedCustomers = async (req, res) => {
    try {
        const productId = req.params.id;

        const interestedCustomers = await Customer.find({
            'cartDetails._id': productId
        });

        const customerDetails = interestedCustomers.map(customer => {
            const cartItem = customer.cartDetails.find(item => item._id.toString() === productId);
            if (cartItem) {
                return {
                    customerName: customer.name,
                    customerID: customer._id,
                    quantity: cartItem.quantity,
                };
            }
            return null; // If cartItem is not found in this customer's cartDetails
        }).filter(item => item !== null); // Remove null values from the result

        if (customerDetails.length > 0) {
            res.send(customerDetails);
        } else {
            res.send({ message: 'No customers are interested in this product.' });
        }
    } catch (error) {
        res.status(500).json(error);
    }
};

const getCustomersWhoOrderedProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        // Fetch orders containing the specified product
        const ordersWithProduct = await Order.find({
            'orderedProducts.productId': productId
        }).populate('buyer', 'name _id');

        if (ordersWithProduct.length === 0) {
            return res.send({ message: 'No customers have ordered this product.' });
        }

        // Extract customer details from the orders
        const customerDetails = ordersWithProduct.map(order => {
            const productInOrder = order.orderedProducts.find(item => item.productId.toString() === productId);

            return {
                customerName: order.buyer.name,
                customerID: order.buyer._id,
                quantity: productInOrder.quantity,
                orderDate: order.paidAt,
                orderID: order._id,
            };
        });

        if (customerDetails.length > 0) {
            res.send(customerDetails);
        } else {
            res.send({ message: 'No customers have ordered this product.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'An error occurred', error });
    }
};

const getAddedToCartProducts = async (req, res) => {
    try {
        const sellerId = req.params.id;

        const customersWithSellerProduct = await Customer.find({
            'cartDetails.seller': sellerId
        });
    

        const productMap = new Map(); // Use a Map to aggregate products by ID
        customersWithSellerProduct.forEach(customer => {
            if (customer.cartDetails && Array.isArray(customer.cartDetails)) {
                customer.cartDetails.forEach(cartItem => {
                    // Check if seller and _id fields exist
                    if (cartItem.seller && cartItem._id) {
                        if (cartItem.seller.toString() === sellerId) {
                            const productId = cartItem._id.toString();
                            if (productMap.has(productId)) {
                                const existingProduct = productMap.get(productId);
                                existingProduct.quantity += cartItem.quantity;
                            } else {
                                productMap.set(productId, {
                                    productName: cartItem.productName,
                                    quantity: cartItem.quantity,
                                    category: cartItem.category,
                                    subcategory: cartItem.subcategory,
                                    productID: productId,
                                });
                            }
                        }
                    } else {
                        // Log warning if seller or _id is missing
                        console.warn("Missing seller or _id in cartItem:", cartItem);
                    }
                });
            }
        });

        const productsInCart = Array.from(productMap.values());
        console.log("Products in cart:", productsInCart);

        if (productsInCart.length > 0) {
            res.send(productsInCart);
        } else {
            res.send({ message: 'No products from this seller are added to cart by customers.' });
        }
    } catch (error) {
        console.error("Error in getAddedToCartProducts:", error);
        res.status(500).json({ message: "Internal Server Error", error });
    }
};



module.exports = {
    productCreate,
    getProducts,
    getSellerProducts,
    getProductDetail,
    updateProduct,
    addReview,
    searchProduct,
    searchProductbyCategory,
    searchProductbySubCategory,
    deleteProduct,
    deleteProducts,
    deleteProductReview,
    deleteAllProductReviews,
    getInterestedCustomers,
    getCustomersWhoOrderedProduct,
    getAddedToCartProducts,
};