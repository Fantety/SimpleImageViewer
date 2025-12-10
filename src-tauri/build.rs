fn main() {
    // 设置macOS应用的额外配置
    #[cfg(target_os = "macos")]
    {
        println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path/../Frameworks");
        
        // 如果有签名证书，可以在这里设置
        if let Ok(signing_identity) = std::env::var("TAURI_SIGNING_IDENTITY") {
            println!("cargo:rustc-env=TAURI_SIGNING_IDENTITY={}", signing_identity);
        }
        
        // 设置应用分类
        println!("cargo:rustc-env=MACOSX_DEPLOYMENT_TARGET=10.13");
    }
    
    tauri_build::build()
}