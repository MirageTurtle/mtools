import sys
import platform


def check_environment():
    # 1. Check Python version
    print("=" * 40)
    print("Python Environment:")
    print(f"Python version: {sys.version}")
    print(f"OS: {platform.system()} {platform.release()}")
    print(f"Architecture: {platform.machine()}")

    # 2. Check PyTorch availability and version
    print("=" * 40)
    try:
        import torch

        print("PyTorch is installed:")
        print(f"PyTorch version: {torch.__version__}")

        # 3. Check CUDA availability and version
        print("=" * 40)
        if torch.cuda.is_available():
            print("CUDA is available:")
            print(f"CUDA version: {torch.version.cuda}")
            print(f"Current device: {torch.cuda.current_device()}")
            print(f"Device name: {torch.cuda.get_device_name(0)}")
            print(f"Number of CUDA devices: {torch.cuda.device_count()}")
        else:
            print(
                "CUDA is NOT available - No supported GPU detected or CUDA not properly installed"
            )

    except ImportError:
        print("PyTorch is NOT installed")


if __name__ == "__main__":
    check_environment()
