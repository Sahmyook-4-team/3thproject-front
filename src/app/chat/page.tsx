'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StompSubscription } from '@stomp/stompjs';
import api from '../utils/api';
import styles from './chat.module.css';
import { useRouter } from 'next/navigation';

// --- 타입 정의 ---
interface ChatMessage {
    content: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    createdAt: string;
}
interface ChatUser {
    userid: string;
    username: string;
    userRole: string;
}
type OnlineUserMap = Record<string, string>;


export default function ChatPage() {
    const { user, isAuthenticated, stompClient } = useAuth(); // 전역 stompClient를 가져옵니다.
    const router = useRouter();

    const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [onlineUsers, setOnlineUsers] = useState<OnlineUserMap>({});
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [lastMessageTimestamps, setLastMessageTimestamps] = useState<Record<string, string>>({});

    // 최초 데이터 로딩 useEffect
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        const fetchInitialData = async () => {
            try {
                const allUsersResponse = await api.get<ChatUser[]>('/api/users');
                setAllUsers(allUsersResponse.data.filter(u => u.userid !== user?.id));
                const onlineUsersResponse = await api.get<OnlineUserMap>('/api/chat/online-users');
                setOnlineUsers(onlineUsersResponse.data);
            } catch (e) {
                console.error("Failed to fetch initial chat data", e);
            }
        };
        fetchInitialData();
    }, [isAuthenticated, router, user]);

    // WebSocket 구독 전용 로직
    useEffect(() => {
         if (!stompClient || !stompClient.connected || !user) {
            return;
        }
        
        // [추가된 부분 1] "저 접속했어요!" 라고 서버에 알리기 (출석 체크)
        // 웹소켓 연결이 확인되면, 바로 '/app/chat.join'으로 자신의 정보를 보냅니다.
        // 이 메시지를 받은 서버는 해당 유저를 온라인 목록에 추가합니다.
        stompClient.publish({
            destination: '/app/chat.join',
            body: JSON.stringify({ senderId: user.id, senderName: user.username })
        });
        
        const subscriptions: StompSubscription[] = [];

        subscriptions.push(
            stompClient.subscribe(`/user/${user.id}/queue/private`, (message) => {
                const receivedMessage: ChatMessage = JSON.parse(message.body);
                setLastMessageTimestamps(prev => ({ ...prev, [receivedMessage.senderId]: receivedMessage.createdAt }));
                if (selectedUser && receivedMessage.senderId === selectedUser.userid) {
                    setMessages(prev => [...prev, receivedMessage]);
                } else {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [receivedMessage.senderId]: (prev[receivedMessage.senderId] || 0) + 1
                    }));
                }
            })
        );

        subscriptions.push(
            stompClient.subscribe('/topic/onlineUsers', (message) => {
                const updatedOnlineUsers: OnlineUserMap = JSON.parse(message.body);
                setOnlineUsers(updatedOnlineUsers);
            })
        );

        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());
        };

    }, [stompClient, user, selectedUser]);

    // 대화 내역 불러오기
    useEffect(() => {
        const fetchHistory = async () => {
            if (selectedUser && user) {
                try {
                    const response = await api.get<ChatMessage[]>(`/api/chat/history/${user.id}/${selectedUser.userid}`);
                    setMessages(response.data);
                } catch (e) { console.error("Failed to fetch chat history", e); }
            }
        };
        fetchHistory();
    }, [selectedUser, user]);

    // 자동 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 메시지 전송 핸들러
    const handleSendMessage = () => {
        if (chatInput && stompClient && user && selectedUser) {
            const now = new Date().toISOString();
            const message: Omit<ChatMessage, 'createdAt'> = {
                content: chatInput,
                senderId: user.id,
                senderName: user.username,
                recipientId: selectedUser.userid,
            };

            stompClient.publish({
                destination: '/app/chat.privateMessage',
                body: JSON.stringify(message)
            });
            

            setMessages(prev => [...prev, { ...message, createdAt: now }]);
            setLastMessageTimestamps(prev => ({ ...prev, [selectedUser.userid]: now }));
            setChatInput('');
        }
    };

  // [신규] 사용자 선택 핸들러 (안 읽은 메시지 초기화 로직 포함)
    const handleUserSelect = (userToSelect: ChatUser) => {
        setSelectedUser(userToSelect);
        // 이 사용자의 안 읽은 메시지 카운트가 있다면 0으로 초기화
        if (unreadCounts[userToSelect.userid]) {
            setUnreadCounts(prev => {
                const newCounts = { ...prev };
                delete newCounts[userToSelect.userid]; // 해당 유저 키를 제거
                return newCounts;
            });
        }
    };

    // [신규] 렌더링 직전에 사용자 목록을 마지막 메시지 시간순으로 정렬
    const sortedUsers = [...allUsers].sort((a, b) => {
        const timeA = lastMessageTimestamps[a.userid];
        const timeB = lastMessageTimestamps[b.userid];
        
        if (timeA && !timeB) return -1; // A만 시간 정보가 있으면 A가 위로
        if (!timeA && timeB) return 1;  // B만 시간 정보가 있으면 B가 위로
        if (!timeA && !timeB) return 0; // 둘 다 없으면 순서 유지

        // 둘 다 시간 정보가 있으면 최신순(내림차순)으로 정렬
        return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    // ▼▼▼ [수정] 비어있던 JSX 렌더링 부분을 복원했습니다 ▼▼▼
    return (
        <div className={styles.chatLayout}>
            <aside className={styles.userSidebar}>
                <div className={styles.sidebarHeader}><h3>대화 상대</h3></div>
                <ul className={styles.userList}>
                    {sortedUsers.map(chatUser => (
                        <li key={chatUser.userid}
                            className={`${styles.userItem} ${selectedUser?.userid === chatUser.userid ? styles.selected : ''}`}
                            onClick={() => handleUserSelect(chatUser)}>
                            
                            <span className={`${styles.statusIndicator} ${onlineUsers[chatUser.userid] ? styles.online : styles.offline}`}></span>
                            
                            <div className={styles.userInfo}>
                                {chatUser.username}
                            </div>

                            {unreadCounts[chatUser.userid] > 0 && (
                                <span className={styles.unreadBadge}>
                                    {unreadCounts[chatUser.userid]}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </aside>

            <main className={styles.chatWindow}>
                {selectedUser ? (
                    <>
                        <header className={styles.chatHeader}><h2>{selectedUser.username}</h2></header>
                        <div className={styles.messageArea}>
                            {messages.map((msg, index) => (
                                <div key={index} className={`${styles.messageBubble} ${msg.senderId === user?.id ? styles.sent : styles.received}`}>
                                    <p>{msg.content}</p>
                                    <span className={styles.timestamp}>{new Date(msg.createdAt).toLocaleTimeString('ko-KR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true // '오전/오후' 표시를 위해 (원치 않으면 false)
                                        })}</span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <footer className={styles.chatInputArea}>
                            <input type="text" placeholder="메시지를 입력하세요..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSendMessage()} />
                            <button onClick={handleSendMessage}>전송</button>
                        </footer>
                    </>
                ) : (
                    <div className={styles.placeholder}><p>대화 상대를 선택하세요.</p></div>
                )}
            </main>
        </div>
    );
}