from boto3.session import Session
import boto3
from typing import Optional
import os
import argparse

access_key = os.getenv("JDCLOUD_ACCESS_KEY")
secret_key = os.getenv("JDCLOUD_SECRET_KEY")
url = os.getenv("JDCLOUD_OSS_ENDPOINT")

def oss_upload(filepath: str, key: str, bucket_name: str="alertreduction"):
    try:
        session = Session(access_key, secret_key)
        s3_client = session.client('s3', endpoint_url=url)
        resp = s3_client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=open(filepath, 'rb').read(),
            StorageClass='STANDARD'
        )
    except Exception as e:
        raise e

def oss_upload_dir(dirpath: str, remote_dir: str, bucket_name: str="alertreduction"):
    """
        Upload all files in the directory to the OSS,
        the directory structure is preserved
    """
    try:
        session = Session(access_key, secret_key)
        s3_client = session.client('s3', endpoint_url=url)
        dirpath_prefix = dirpath if dirpath[-1] == '/' else dirpath + '/'
        for root, dirs, files in os.walk(dirpath):
            for file in files:                
                local_file = os.path.join(root, file)
                remote_file = os.path.join(remote_dir, local_file.replace(dirpath_prefix, ''))
                print(f"[*] Uploading {local_file} to {remote_file}")
                resp = s3_client.put_object(
                    Bucket=bucket_name,
                    Key=remote_file,
                    Body=open(local_file, 'rb').read(),
                    StorageClass='STANDARD'
                )
    except Exception as e:
        raise e
    

def oss_download(
        # access_key: str,
        # secret_key: str,
        # url: str,
        key: str,
        local_save_dir: Optional[str]=None,
        bucket_name: str="alertreduction"
):
    try:
        session = Session(access_key, secret_key)
        s3_client = session.client('s3', endpoint_url=url)
        result = s3_client.get_object(Bucket=bucket_name, Key=key)
        if local_save_dir is not None:
            with open(os.path.join(local_save_dir, key), 'wb') as f:
                f.write(result['Body'].read())
        return result['Body'].read()
    except Exception as e:
        raise e


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Upload or download file from JDCLOUD OSS")
    parser.add_argument("-a", "--action", help="upload or download", default="download")
    parser.add_argument("-f", "--filepath", help="local file path or dir",required=True)
    parser.add_argument("-k", "--key", help="oss key", required=True)
    parser.add_argument("-b", "--bucket", help="oss bucket name", default="alertreduction")
    parser.add_argument("--ignore", help="the files/dirs to ignore when uploading", default=".git", nargs="*")
    args = parser.parse_args()
    if args.action == "upload":
        print(f"[*] Uploading {args.filepath} to {args.key}, ignoring: {args.ignore}")
        if os.path.isdir(args.filepath):
            oss_upload_dir(args.filepath, args.key, args.bucket)
        else:
            oss_upload(args.filepath, args.key, args.bucket)
    elif args.action == "download":
        if args.filepath is None:
            raise ValueError("Please provide local file path")
        oss_download(args.key, args.filepath, args.bucket)
    else:
        raise ValueError("Invalid action, should be upload or download")
