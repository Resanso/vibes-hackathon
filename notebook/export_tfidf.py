import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
import json
import os

print("Memuat dataset dan mengekspor TF-IDF metadata...")

# Pastikan path relatif benar
df = pd.read_csv('data/dataset_pinjol_nlp.csv')

# Fit TfidfVectorizer persis seperti di notebook
tfidf = TfidfVectorizer(max_features=5000, stop_words=None)
tfidf.fit(df['text'])

# Ambil vocabulary (mapping kata -> index) dan IDF weights, ubah tipe ke python native
vocab = {k: int(v) for k, v in tfidf.vocabulary_.items()}
idf = [float(x) for x in tfidf.idf_]

# Pastikan folder assets ada
assets_dir = os.path.join('..', 'mobile-app', 'assets')
os.makedirs(assets_dir, exist_ok=True)

# Simpan ke folder mobile-app
output_path = os.path.join(assets_dir, 'tfidf_metadata.json')
with open(output_path, 'w') as f:
    json.dump({'vocab': vocab, 'idf': idf}, f)

print(f"Berhasil mengekspor metadata ke: {output_path}")
