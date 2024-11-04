from flask import Flask, request, jsonify, render_template
from PIL import Image
import numpy as np
import tensorflow as tf
from io import BytesIO

app = Flask(__name__)

# Load the pre-trained MobileNetV2 model
model = tf.keras.applications.MobileNetV2(weights='imagenet')

# Define a function to preprocess the image
def preprocess_image(image):
    image = image.resize((224, 224))
    image_array = np.array(image)
    image_array = tf.keras.applications.mobilenet_v2.preprocess_input(image_array)
    image_array = np.expand_dims(image_array, axis=0)
    return image_array

# Define a function to get predictions
def get_predictions(image):
    image_array = preprocess_image(image)
    predictions = model.predict(image_array)
    decoded_predictions = tf.keras.applications.mobilenet_v2.decode_predictions(predictions, top=3)[0]
    
    # Convert predictions to a serializable format
    results = [{"label": label, "score": float(score)} for _, label, score in decoded_predictions]
    return results

@app.route('/upload-image', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file:
        image = Image.open(file.stream)
        predictions = get_predictions(image)
        return jsonify({"predictions": predictions})
    
    return jsonify({"error": "Failed to process image"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)  # Run on a different port from Express
