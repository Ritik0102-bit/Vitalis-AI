# The "Broke Student" Guide to Training a Custom Healthcare AI

Since you are a student and want to do this for absolutely $0, we will use **Google Colab's Free Tier** to train the model, and **Hugging Face Spaces** to host it for free!

Here is the exact roadmap to build your custom Vitalis AI.

## Step 1: Prepare Your Google Colab Environment
Google Colab provides a free NVIDIA T4 GPU. It is powerful enough to train a model if we use a technique called "4-bit quantization" (QLoRA) to compress the model to fit into the free GPU's memory.

1. Go to [Google Colab](https://colab.research.google.com/).
2. Click **New Notebook**.
3. In the top menu, go to **Runtime > Change runtime type**.
4. Select **T4 GPU** and click Save. (This gives you a free graphics card!).

## Step 2: The Training Code
Copy and paste this exact code into your Colab notebook. This script uses the `unsloth` library, which makes training 2x faster and uses less memory, perfectly optimized for free Colab GPUs.

```python
# 1. Install necessary libraries
!pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
!pip install --no-deps xformers trl peft accelerate bitsandbytes

from unsloth import FastLanguageModel
import torch

# 2. Load the base Llama-3 Model (compressed to 4-bit to fit in the free GPU)
max_seq_length = 2048
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/llama-3-8b-Instruct-bnb-4bit",
    max_seq_length = max_seq_length,
    dtype = None,
    load_in_4bit = True,
)

# 3. Add LoRA Adapters (This is what we are actually training)
model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha = 16,
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = "unsloth",
)

# 4. Load the ChatDoctor Dataset
from datasets import load_dataset
# We use a processed version of ChatDoctor on HuggingFace
dataset = load_dataset("lavita/ChatDoctor-HealthCareMagic-100k", split = "train[:5000]") # Using 5k examples for fast free training

# 5. Format the data for Llama-3
def format_prompts(examples):
    instructions = examples["instruction"]
    inputs       = examples["input"]
    outputs      = examples["output"]
    texts = []
    for instruction, input, output in zip(instructions, inputs, outputs):
        # Create a healthcare conversation template
        text = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nYou are Vitalis AI, a healthcare assistant.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{input}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n{output}<|eot_id|>"
        texts.append(text)
    return { "text" : texts }

dataset = dataset.map(format_prompts, batched = True)

# 6. Set up the Trainer
from trl import SFTTrainer
from transformers import TrainingArguments

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        warmup_steps = 5,
        max_steps = 60, # Train for 60 steps (takes ~5 minutes on free GPU to test)
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 1,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs",
    ),
)

# 7. Start Training!
print("Starting Training...")
trainer_stats = trainer.train()

# 8. Save your Custom Model
model.save_pretrained("vitalis_ai_lora")
tokenizer.save_pretrained("vitalis_ai_lora")
print("Model saved successfully!")
```

## Step 3: Pushing to Hugging Face
Once training is done, you need to upload it to Hugging Face so we can use it as an API.
1. Create a free account on [Hugging Face](https://huggingface.co/).
2. Go to your settings and create an **Access Token** (with WRITE permissions).
3. Add this code block to the bottom of your Colab notebook and run it:

```python
# Save the model to your Hugging Face account
HF_TOKEN = "paste_your_huggingface_token_here"

# This merges your custom medical training with the base model and uploads it
model.push_to_hub_merged("your-hf-username/vitalis-ai", tokenizer, save_method = "lora", token = HF_TOKEN)
```

---

## What happens after this?
Once your model is on Hugging Face, we can deploy it as a free **Hugging Face Space**. We will write a tiny Python app to expose it as an API, and then connect your `c:\Users\Ritik\Desktop\VITALIS\api\chat.js` to that new URL.

**Are you ready to run the Colab notebook? Let me know if you run into any errors while it's training!**
